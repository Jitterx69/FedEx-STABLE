use prost::Message;
use rand::Rng;
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{CommitMode, Consumer, StreamConsumer};
use rdkafka::message::Message as KafkaMessage;
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::sync::{Arc, Mutex};
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

// Governance Parameters (In memory for now, later API driven)
struct GovernanceState {
    information_sharpness: f64, // 0.0 to 1.0
    noise_injection: f64,       // 0.0 to 1.0 (amplitude)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    info!("Starting Adaptive Signal Regulator (ASR)...");

    let gov_state = Arc::new(Mutex::new(GovernanceState {
        information_sharpness: 0.8, // Default: High fidelity
        noise_injection: 0.1,       // Default: Low noise
    }));

    let kafka_bootstrap =
        std::env::var("KAFKA_BOOTSTRAP").unwrap_or_else(|_| "localhost:19092".to_string());

    // Kafka Consumer
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", "stable-regulator-group")
        .set("bootstrap.servers", &kafka_bootstrap)
        .set("enable.auto.commit", "true")
        .create()?;

    consumer.subscribe(&["stable-events"])?;

    // Kafka Producer
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
                        match envelope.event_type.as_str() {
                            "InternalEstimateGenerated" => {
                                if let Some(
                                    proto::event_envelope::Payload::InternalEstimateGenerated(est),
                                ) = envelope.payload
                                {
                                    process_estimate(est, &gov_state, &producer).await;
                                }
                            }
                            "GovernanceConfigUpdated" => {
                                if let Some(
                                    proto::event_envelope::Payload::GovernanceConfigUpdated(cfg),
                                ) = envelope.payload
                                {
                                    let mut g = gov_state.lock().unwrap();
                                    g.information_sharpness = cfg.information_sharpness;
                                    g.noise_injection = cfg.noise_injection;
                                    info!(
                                        "Governance Params Updated: Sharpness={:.2}, Noise={:.2}",
                                        g.information_sharpness, g.noise_injection
                                    );
                                }
                            }
                            _ => {}
                        }
                    }
                }
                consumer.commit_message(&m, CommitMode::Async).unwrap();
            }
        }
    }
}

async fn process_estimate(
    estimate: proto::InternalEstimateGenerated,
    gov: &Arc<Mutex<GovernanceState>>,
    producer: &FutureProducer,
) {
    let (sharpness, noise_amp) = {
        let g = gov.lock().unwrap();
        (g.information_sharpness, g.noise_injection)
    };

    info!(
        "Regulating Estimate for {}: Raw={:.2}, Sharpness={:.2}, Noise={:.2}",
        estimate.target_account_id, estimate.raw_recovery_probability, sharpness, noise_amp
    );

    // ---------------------------------------------------------
    // CORE LOGIC: INFORMATION REGULATION
    // Formula: Signal = (Raw * Sharpness) + Noise
    // ---------------------------------------------------------
    let mut rng = rand::rng();
    let noise: f64 = rng.random_range(-1.0..1.0) * noise_amp;

    // We dampen the true signal by the sharpness factor
    // If Sharpness = 1.0, we see full raw. If 0.5, we see 50% raw + noise.
    // This is a simplified "Information Barrier" implementation.
    let regulated_score = (estimate.raw_recovery_probability * sharpness) + noise;

    // Clamp to 0-1
    let final_score = regulated_score.clamp(0.0, 1.0);

    // Quantize into Bands (The "View" DCAs see)
    let priority_band = if final_score > 0.7 {
        "High"
    } else if final_score > 0.3 {
        "Medium"
    } else {
        "Low"
    };

    // Emit Regulated Signal
    let signal_event = proto::RegulatedSignalReleased {
        signal_id: Uuid::new_v4().to_string(),
        target_assignment_id: "".to_string(), // In real flow, we'd link to assignment.
        priority_band: priority_band.to_string(),
        noise_factor_applied: noise,
    };

    let envelope = proto::EventEnvelope {
        event_id: Uuid::new_v4().to_string(),
        event_type: "RegulatedSignalReleased".to_string(),
        source: "stable-regulator".to_string(),
        schema_version: "1.0.0".to_string(),
        occurrence_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
        ingestion_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
        payload: Some(proto::event_envelope::Payload::RegulatedSignalReleased(
            signal_event,
        )),
    };

    let mut buf = Vec::new();
    envelope.encode(&mut buf).unwrap();
    let record = FutureRecord::to("stable-events")
        .payload(&buf)
        .key(&envelope.event_id);

    if let Err((e, _)) = producer.send(record, Duration::from_secs(5)).await {
        error!("Failed to publish regulated signal: {:?}", e);
    } else {
        info!(
            "Released Signal: Band={} (derived from raw {:.2})",
            priority_band, estimate.raw_recovery_probability
        );
    }
}
