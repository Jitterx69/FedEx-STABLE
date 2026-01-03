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
    outstanding_balance: f64,
    days_past_due: i32,
}

#[derive(serde::Serialize)]
struct PredictionRequest {
    balance: f64,
    days_past_due: i32,
}

#[derive(serde::Deserialize)]
struct PredictionResponse {
    recovery_probability: Option<f64>,
    error: Option<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    info!("Starting Assignment Engine (Round-Robin with AI Insight)...");

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

    // 3. HTTP Client for AI
    let http_client = reqwest::Client::new();
    let estimation_url = std::env::var("ESTIMATION_URL").unwrap_or_else(|_| "http://localhost:5001/predict".to_string());

    // Mock DCA Performance for Weighted Random
    let dca_ids = ["DCA_ALPHA", "DCA_BETA", "DCA_GAMMA"];
    let weights = [80, 50, 20]; // Alpha is best, Gamma is worst
    let dist = rand::distributions::WeightedIndex::new(&weights).unwrap();
    let mut rng = rand::thread_rng();

    // 4. Assignment Loop
    loop {
        // A. Poll for unassigned accounts
        let unassigned_accounts = sqlx::query_as::<_, UnassignedAccount>(
            "SELECT account_id, outstanding_balance, days_past_due FROM accounts WHERE status = 'ingested' LIMIT 10"
        )
        .fetch_all(&pool)
        .await?;

        if unassigned_accounts.is_empty() {
            tokio::time::sleep(Duration::from_secs(2)).await;
            continue;
        }

        for account in unassigned_accounts {
            // B. Get AI Prediction
            let payload = PredictionRequest {
                balance: account.outstanding_balance,
                days_past_due: account.days_past_due,
            };

            let probability = match http_client.post(&estimation_url).json(&payload).send().await {
                Ok(resp) => {
                    match resp.json::<PredictionResponse>().await {
                        Ok(data) => data.recovery_probability.unwrap_or(0.0),
                        Err(e) => {
                            error!("Failed to parse prediction response: {}", e);
                            0.0
                        }
                    }
                },
                Err(e) => {
                    error!("Failed to call estimation service: {}", e);
                    0.0
                }
            };

            info!("Account {} | Balance: ${:.2} | DPD: {} | AI Probability: {:.1}%", 
                account.account_id, account.outstanding_balance, account.days_past_due, probability * 100.0);

            // C. Weighted Random Selection
            use rand::distributions::Distribution;
            let selected_dca = dca_ids[dist.sample(&mut rng)];

            info!("-> Assigning to {}", selected_dca);

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
            }
        }
        
        // Wait a bit for projection to process the events and update status
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
}
