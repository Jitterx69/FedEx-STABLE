use rdkafka::config::ClientConfig;
use rdkafka::consumer::{CommitMode, Consumer, StreamConsumer};
use rdkafka::message::Message;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tracing::{error, info};

// Include generated protos
pub mod stable_proto {
    pub mod events {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/stable.events.v1.rs"));
        }
    }
}
use prost::Message as ProstMessage;
use stable_proto::events::v1 as proto; // Trait for decoding

struct ProjectionState {
    db_pool: sqlx::PgPool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    info!("Starting Projection Engine...");

    // 1. Connect to DB
    let database_url = std::env::var("POSTGRES_URL").expect("POSTGRES_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    // Run Migrations
    sqlx::migrate!("./migrations").run(&pool).await?;
    info!("Database migrations applied.");

    let state = Arc::new(ProjectionState { db_pool: pool });

    // 2. Setup Kafka Consumer
    let kafka_bootstrap = std::env::var("KAFKA_BOOTSTRAP").expect("KAFKA_BOOTSTRAP must be set");
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", "stable-projection-group")
        .set("bootstrap.servers", &kafka_bootstrap)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true")
        .create()?;

    consumer.subscribe(&["stable-events"])?;
    info!("Subscribed to stable-events topic.");

    // 3. Event Loop
    loop {
        match consumer.recv().await {
            Err(e) => error!("Kafka error: {}", e),
            Ok(m) => {
                if let Some(payload) = m.payload() {
                    // Decide protobuf
                    if let Ok(envelope) = proto::EventEnvelope::decode(payload) {
                        process_event(envelope, &state).await;
                    } else {
                        error!("Failed to decode Protobuf message");
                    }
                }
                consumer.commit_message(&m, CommitMode::Async).unwrap();
            }
        }
    }
}

async fn process_event(envelope: proto::EventEnvelope, state: &Arc<ProjectionState>) {
    info!(
        "Processing Event: {} type={}",
        envelope.event_id, envelope.event_type
    );

    if let Some(payload) = envelope.payload {
        match payload {
            proto::event_envelope::Payload::AccountIngested(event) => {
                // Upsert Account
                let result = sqlx::query(
                    r#"
                    INSERT INTO accounts (account_id, outstanding_balance, days_past_due, status)
                    VALUES ($1, $2, $3, 'ingested')
                    ON CONFLICT (account_id) DO UPDATE
                    SET outstanding_balance = EXCLUDED.outstanding_balance,
                        days_past_due = EXCLUDED.days_past_due,
                        updated_at = NOW()
                    "#,
                )
                .bind(&event.account_id)
                .bind(event.outstanding_balance)
                .bind(event.days_past_due)
                .execute(&state.db_pool)
                .await;

                if let Err(e) = result {
                    error!("DB Error on AccountIngested: {}", e);
                }
            }
            proto::event_envelope::Payload::AssignmentCreated(event) => {
                // Update Account Status & Insert Assignment
                let mut tx = state.db_pool.begin().await.unwrap();

                let _q1 =
                    sqlx::query("UPDATE accounts SET status = 'assigned' WHERE account_id = $1")
                        .bind(&event.account_id)
                        .execute(&mut *tx)
                        .await;

                let _q2 = sqlx::query(
                    r#"
                    INSERT INTO assignments (assignment_id, account_id, dca_id)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (assignment_id) DO NOTHING
                    "#,
                )
                .bind(&event.assignment_id)
                .bind(&event.account_id)
                .bind(&event.dca_id)
                .execute(&mut *tx)
                .await;

                if let Err(e) = tx.commit().await {
                    error!("Transaction failed for Assignment: {}", e);
                }
            }
            proto::event_envelope::Payload::AccountRecovered(event) => {
                let _ = sqlx::query(
                    "UPDATE accounts SET status = 'recovered', updated_at = NOW() WHERE account_id = $1",
                )
                .bind(&event.account_id)
                .execute(&state.db_pool)
                .await;
            }
            proto::event_envelope::Payload::AccountEscalated(event) => {
                let _ = sqlx::query(
                    "UPDATE accounts SET status = 'escalated', updated_at = NOW() WHERE account_id = $1",
                )
                .bind(&event.account_id)
                .execute(&state.db_pool)
                .await;
            }
            _ => {
                info!("Event type not handled by projection yet.");
            }
        }
    }
}
