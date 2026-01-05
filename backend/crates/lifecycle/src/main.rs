use prost::Message;
use rand::Rng;
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{CommitMode, Consumer, StreamConsumer};
use rdkafka::message::Message as KafkaMessage;
use rdkafka::producer::{FutureProducer, FutureRecord};
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

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    info!("Starting Lifecycle Simulation Engine...");

    let kafka_bootstrap =
        std::env::var("KAFKA_BOOTSTRAP").unwrap_or_else(|_| "localhost:19092".to_string());

    // Consumer (AssignmentCreated)
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", "stable-lifecycle-group")
        .set("bootstrap.servers", &kafka_bootstrap)
        .set("enable.auto.commit", "true")
        .create()?;

    consumer.subscribe(&["stable-events"])?;

    // Producer (AccountRecovered, AccountEscalated)
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &kafka_bootstrap)
        .set("message.timeout.ms", "5000")
        .create()?;

    loop {
        match consumer.recv().await {
            Err(e) => error!("Kafka error: {}", e),
            Ok(m) => {
                if let Some(payload) = m.payload() {
                    if let Ok(envelope) = proto::EventEnvelope::decode(payload) {
                        if let Some(proto::event_envelope::Payload::AssignmentCreated(event)) =
                            envelope.payload
                        {
                            // SIMULATE LIFECYCLE
                            // 80% change to recover, 20% to escalate
                            // Delay slightly to simulate time passing (in real app, this would be days)
                            // For demo, we do it immediately or with slight random delay?
                            // Let's just emit immediately for instant graph gratification.

                            simulate_resolution(&event, &producer).await;
                        }
                    }
                }
                consumer.commit_message(&m, CommitMode::Async)?;
            }
        }
    }
}

async fn simulate_resolution(assignment: &proto::AssignmentCreated, producer: &FutureProducer) {
    let mut rng = rand::rng();
    let outcome = rng.random_range(0.0..1.0);

    let (payload, event_type) = if outcome < 0.8 {
        // RECOVER
        info!(
            "Account {} recovered by {}",
            assignment.account_id, assignment.dca_id
        );
        (
            proto::event_envelope::Payload::AccountRecovered(proto::AccountRecovered {
                account_id: assignment.account_id.clone(),
                recovered_amount: 100.0, // Mock amount
            }),
            "AccountRecovered",
        )
    } else {
        // ESCALATE
        info!(
            "Account {} escalated by {}",
            assignment.account_id, assignment.dca_id
        );
        (
            proto::event_envelope::Payload::AccountEscalated(proto::AccountEscalated {
                account_id: assignment.account_id.clone(),
                reason: "Customer Refusal".to_string(),
            }),
            "AccountEscalated",
        )
    };

    let envelope = proto::EventEnvelope {
        event_id: Uuid::new_v4().to_string(),
        event_type: event_type.to_string(),
        source: "lifecycle-sim".to_string(),
        schema_version: "1.0.0".to_string(),
        occurrence_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
        ingestion_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
        payload: Some(payload),
    };

    let mut buf = Vec::new();
    envelope.encode(&mut buf).unwrap();
    let record = FutureRecord::to("stable-events")
        .payload(&buf)
        .key(&envelope.event_id);

    let _ = producer.send(record, Duration::from_secs(5)).await;
}
