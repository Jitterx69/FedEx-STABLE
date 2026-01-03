use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
    Json, Router,
};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::ClientConfig;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tower_http::trace::TraceLayer;
use uuid::Uuid;

// Include the generated proto modules
pub mod stable_proto {
    pub mod events {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/stable.events.v1.rs"));
        }
    }
}
use stable_proto::events::v1 as proto;

// App State
struct AppState {
    kafka_producer: FutureProducer,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let kafka_bootstrap = std::env::var("KAFKA_BOOTSTRAP")
        .unwrap_or_else(|_| "localhost:19092".to_string());

    // Initialize Kafka Producer
    let kafka_producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &kafka_bootstrap)
        .set("message.timeout.ms", "5000")
        .create()
        .expect("Producer creation error");

    let state = Arc::new(AppState { kafka_producer });

    // Build Router
    let app = Router::new()
        .route("/ingest/account", post(ingest_account))
        .route("/resolve/account", post(resolve_account))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Run Server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Ingress Service listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}

// DTO for JSON Input
#[derive(Deserialize, Serialize)]
struct IngestAccountRequest {
    account_id: String,
    balance: f64,
    days_past_due: i32,
}

// Handler: Ingest Account
async fn ingest_account(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<IngestAccountRequest>,
) -> StatusCode {
    tracing::info!("Received account ingestion: {}", payload.account_id);

    // 1. Create the Payload Proto
    let account_event = proto::AccountIngested {
        account_id: payload.account_id,
        outstanding_balance: payload.balance,
        days_past_due: payload.days_past_due,
    };

    publish_event(
        "AccountIngested", 
        proto::event_envelope::Payload::AccountIngested(account_event), 
        &state.kafka_producer
    ).await
}

// Handler: Resolve Account
#[derive(Deserialize)]
struct ResolveAccountRequest {
    account_id: String,
    amount: f64,
}

async fn resolve_account(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ResolveAccountRequest>,
) -> StatusCode {
    tracing::info!("Received account resolution: {}", payload.account_id);

    // 1. Create Payload
    let resolution_event = proto::AccountRecovered {
        account_id: payload.account_id,
        recovered_amount: payload.amount,
    };

    publish_event(
        "AccountRecovered",
        proto::event_envelope::Payload::AccountRecovered(resolution_event),
        &state.kafka_producer
    ).await
}

// Helper to publish events
async fn publish_event(
    event_type: &str,
    payload: proto::event_envelope::Payload,
    producer: &FutureProducer,
) -> StatusCode {
    let envelope = proto::EventEnvelope {
        event_id: Uuid::new_v4().to_string(),
        event_type: event_type.to_string(),
        source: "ingress-svc".to_string(),
        schema_version: "1.0.0".to_string(),
        occurrence_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
        ingestion_time: Some(prost_types::Timestamp::from(std::time::SystemTime::now())),
        payload: Some(payload),
    };

    use prost::Message;
    let mut buf = Vec::new();
    envelope.encode(&mut buf).unwrap();

    let record = FutureRecord::to("stable-events")
        .payload(&buf)
        .key(&envelope.event_id);

    match producer.send(record, Duration::from_secs(5)).await {
        Ok(_) => StatusCode::CREATED,
        Err((e, _)) => {
            tracing::error!("Kafka pub error: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
