use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::ClientConfig;
use serde::Deserialize;
use std::sync::Arc;
use std::time::Duration;
use tower_http::trace::TraceLayer;
use uuid::Uuid;

pub mod stable_proto {
    pub mod events {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/stable.events.v1.rs"));
        }
    }
}
use stable_proto::events::v1 as proto;

struct AppState {
    kafka_producer: FutureProducer,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let kafka_bootstrap =
        std::env::var("KAFKA_BOOTSTRAP").unwrap_or_else(|_| "localhost:19092".to_string());

    let kafka_producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &kafka_bootstrap)
        .set("message.timeout.ms", "5000")
        .create()
        .expect("Producer creation error");

    let state = Arc::new(AppState { kafka_producer });

    let app = Router::new()
        .route("/governance/controls", post(update_controls))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    tracing::info!(
        "Admin Service listening on {}",
        listener.local_addr().unwrap()
    );
    axum::serve(listener, app).await.unwrap();
}

#[derive(Deserialize)]
struct UpdateControlsRequest {
    information_sharpness: f64,
    noise_injection: f64,
}

async fn update_controls(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpdateControlsRequest>,
) -> StatusCode {
    tracing::info!(
        "Updating Governance Controls: Sharpness={}, Noise={}",
        payload.information_sharpness,
        payload.noise_injection
    );

    let event = proto::GovernanceConfigUpdated {
        config_id: Uuid::new_v4().to_string(),
        information_sharpness: payload.information_sharpness,
        noise_injection: payload.noise_injection,
    };

    let envelope = proto::EventEnvelope {
        event_id: Uuid::new_v4().to_string(),
        event_type: "GovernanceConfigUpdated".to_string(),
        source: "admin-svc".to_string(),
        schema_version: "1.0.0".to_string(),
        occurrence_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
        ingestion_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
        payload: Some(proto::event_envelope::Payload::GovernanceConfigUpdated(
            event,
        )),
    };

    let mut buf = Vec::new();
    use prost::Message;
    envelope.encode(&mut buf).unwrap();

    let record = FutureRecord::to("stable-events")
        .payload(&buf)
        .key(&envelope.event_id); // This ensures ordering if partition key is consistent, but globally impacting config might want broadcast.
                                  // For simple single partition, this is fine.

    match state
        .kafka_producer
        .send(record, Duration::from_secs(5))
        .await
    {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
