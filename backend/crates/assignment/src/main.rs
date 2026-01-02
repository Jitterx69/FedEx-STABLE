use prost::Message;
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;
use tracing::{error, info};
use uuid::Uuid;

pub mod stable_proto {
    pub mod events {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/stable.events.v1.rs"));
        }
    }
}
use stable_proto::events::v1 as proto;

// Hardcoded for Phase 2
const DCA_POOL: &[&str] = &["DCA_ALPHA", "DCA_BETA", "DCA_GAMMA"];
const MAX_CAPACITY_PER_DCA: i64 = 50; // Simple constraint

#[derive(sqlx::FromRow)]
struct UnassignedAccount {
    account_id: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    info!("Starting Assignment Engine (Round-Robin)...");

    // 1. Database Connection (to read Ingested accounts)
    let database_url = std::env::var("POSTGRES_URL").expect("POSTGRES_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    // 2. Kafka Producer (to emit AssignmentCreated)
    let kafka_bootstrap = std::env::var("KAFKA_BOOTSTRAP").expect("KAFKA_BOOTSTRAP must be set");
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &kafka_bootstrap)
        .set("message.timeout.ms", "5000")
        .create()?;

    // 3. Assignment Loop
    let mut dca_index = 0;
    loop {
        // A. Poll for unassigned accounts
        // A. Poll for unassigned accounts
        let unassigned_accounts = sqlx::query_as::<_, UnassignedAccount>(
            "SELECT account_id FROM accounts WHERE status = 'ingested' LIMIT 10"
        )
        .fetch_all(&pool)
        .await?;

        if unassigned_accounts.is_empty() {
            tokio::time::sleep(Duration::from_secs(2)).await;
            continue;
        }

        for account in unassigned_accounts {
            // B. Check Capacity (Simulation)
            // In a real system, we'd query the 'assignments' table to count active loads.
            // For Phase 2, we assume infinite capacity for simplicity or mocked check.
            
            // C. Round-Robin Selection
            let selected_dca = DCA_POOL[dca_index];
            dca_index = (dca_index + 1) % DCA_POOL.len();

            info!("Assigning account {} to {}", account.account_id, selected_dca);

            // D. Create Event
            let assignment_event = proto::AssignmentCreated {
                assignment_id: Uuid::new_v4().to_string(),
                account_id: account.account_id.clone(),
                dca_id: selected_dca.to_string(),
            };

            let envelope = proto::EventEnvelope {
                event_id: Uuid::new_v4().to_string(),
                event_type: "AssignmentCreated".to_string(),
                source: "assignment-engine".to_string(),
                schema_version: "1.0.0".to_string(),
                occurrence_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
                ingestion_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
                payload: Some(proto::event_envelope::Payload::AssignmentCreated(assignment_event)),
            };

            // E. Publish to Kafka
            let mut buf = Vec::new();
            envelope.encode(&mut buf)?;
            let record = FutureRecord::to("stable-events")
                .payload(&buf)
                .key(&envelope.event_id);

            if let Err((e, _)) = producer.send(record, Duration::from_secs(5)).await {
                error!("Failed to publish assignment: {:?}", e);
            } else {
                // Optimistically update local state to avoid re-assigning immediately? 
                // No, relied on Projection to update DB 'status' -> 'assigned'.
                // Ideally this loop should assume 'eventual consistency' and ignore this ID for a bit,
                // or we use 'SELECT ... FOR UPDATE SKIP LOCKED' pattern.
                // For Phase 2 Demo, we'll just wait for Projection to catch up or rely on LIMIT.
            }
        }
        
        // Wait a bit for projection to process the events and update status
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}
