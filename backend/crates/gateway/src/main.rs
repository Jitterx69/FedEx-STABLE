use axum::{
    extract::State,
    http::Method,
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
struct AppState {
    db_pool: sqlx::PgPool,
    ingress_url: String,
    admin_url: String,
    http_client: reqwest::Client,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    tracing::info!("Starting STABLE Unified Gateway...");

    let db_url = std::env::var("POSTGRES_URL")
        .unwrap_or_else(|_| "postgres://stable_user:stable_password@localhost:5435/stable_core".to_string());
    
    let ingress_url = std::env::var("INGRESS_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
        
    let admin_url = std::env::var("ADMIN_URL")
        .unwrap_or_else(|_| "http://localhost:3001".to_string());

    // 1. Database Connection (Read-Side)
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Failed to connect to DB");

    let state = Arc::new(AppState {
        db_pool: pool,
        ingress_url,
        admin_url,
        http_client: reqwest::Client::new(),
    });

    // 2. CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any);

    // 3. Router
    // ...
    let app = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/ingest/account", post(proxy_ingest))
        .route("/api/governance/controls", post(proxy_governance))
        .route("/api/accounts", get(list_accounts))
        .route("/api/stats", get(get_system_stats))
        .route("/api/dca/:dca_id/assignments", get(list_dca_assignments))
        .route("/api/resolve/account", post(proxy_resolve))
        .layer(cors)
        .with_state(state);

    let list_addr = "0.0.0.0:8080";
    let listener = tokio::net::TcpListener::bind(list_addr).await.unwrap();
    tracing::info!("Gateway listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "OK"
}

// Proxy to Ingress
async fn proxy_ingest(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) ->  impl axum::response::IntoResponse {
    let resp = state.http_client
        .post(format!("{}/ingest/account", state.ingress_url))
        .json(&payload)
        .send()
        .await;

    match resp {
        Ok(r) => {
            let status = axum::http::StatusCode::from_u16(r.status().as_u16())
                .unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR);
            (status, AxumJson(r.json::<Value>().await.unwrap_or_default()))
        },
        Err(_) => (axum::http::StatusCode::BAD_GATEWAY, AxumJson(serde_json::json!({"error": "Ingress unavailable"}))),
    }
}

// Proxy to Admin
async fn proxy_governance(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl axum::response::IntoResponse {
    let resp = state.http_client
        .post(format!("{}/governance/controls", state.admin_url))
        .json(&payload)
        .send()
        .await;

    match resp {
        Ok(r) => {
            let status = axum::http::StatusCode::from_u16(r.status().as_u16())
                .unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR);
            (status, AxumJson(r.json::<Value>().await.unwrap_or_default()))
        },
        Err(_) => (axum::http::StatusCode::BAD_GATEWAY, AxumJson(serde_json::json!({"error": "Admin unavailable"}))),
    }
}

// Read Model: List Accounts
#[derive(Serialize, sqlx::FromRow)]
struct AccountView {
    account_id: String,
    outstanding_balance: f64,
    status: String,
    days_past_due: i32,
}

async fn list_accounts(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<AccountView>> {
    let accounts = sqlx::query_as::<_, AccountView>(
        "SELECT account_id, outstanding_balance, status, days_past_due FROM accounts ORDER BY created_at DESC LIMIT 50"
    )
    .fetch_all(&state.db_pool)
    .await
    .unwrap_or_default();

    Json(accounts)
}

// System Stats
#[derive(Serialize)]
struct SystemStats {
    total: i64,
    active: i64,
    recovered: i64,
    escalated: i64,
}

async fn get_system_stats(
    State(state): State<Arc<AppState>>,
) -> Json<SystemStats> {
    // Count by status
    // Note: status strings are lowercase in DB: 'ingested', 'assigned', 'active', 'recovered', 'escalated', 'closed'
    
    // We can do a single query to do counts or multiple. A single GROUP BY is efficient.
    #[derive(sqlx::FromRow)]
    struct StatusCount {
        status: Option<String>,
        count: Option<i64>,
    }

    let rows = sqlx::query_as::<_, StatusCount>(
        r#"
        SELECT status, COUNT(*) as count 
        FROM accounts 
        GROUP BY status
        "#
    )
    .fetch_all(&state.db_pool)
    .await
    .unwrap_or_default();

    let mut stats = SystemStats {
        total: 0,
        active: 0,
        recovered: 0,
        escalated: 0,
    };

    for row in rows {
        let count = row.count.unwrap_or(0);
        stats.total += count;
        match row.status.as_deref().unwrap_or("unknown") {
            "ingested" | "assigned" | "active" => stats.active += count,
            "recovered" | "cleared" | "closed" => stats.recovered += count,
            "escalated" | "review" => stats.escalated += count,
            _ => {} // ignore others or map to active?
        }
    }

    Json(stats)
}

// DCA Assignment List
#[derive(Serialize, sqlx::FromRow)]
struct AssignmentView {
    assignment_id: String,
    account_id: String,
    balance: f64,
    dpd: i32,
    status: String,
}

async fn list_dca_assignments(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(dca_id): axum::extract::Path<String>,
) -> Json<Vec<AssignmentView>> {
    let assignments = sqlx::query_as::<_, AssignmentView>(
        r#"
        SELECT 
            ass.assignment_id, 
            acc.account_id, 
            acc.outstanding_balance as balance, 
            acc.days_past_due as dpd,
            acc.status
        FROM assignments ass
        JOIN accounts acc ON ass.account_id = acc.account_id
        WHERE ass.dca_id = $1
        ORDER BY acc.days_past_due DESC
        "#
    )
    .bind(dca_id)
    .fetch_all(&state.db_pool)
    .await
    .unwrap_or_default();

    Json(assignments)
}

// Proxy Resolve
async fn proxy_resolve(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl axum::response::IntoResponse {
    let resp = state.http_client
        .post(format!("{}/resolve/account", state.ingress_url))
        .json(&payload)
        .send()
        .await;

    match resp {
        Ok(r) => {
            let status = axum::http::StatusCode::from_u16(r.status().as_u16())
                .unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR);
            (status, AxumJson(r.json::<Value>().await.unwrap_or_default()))
        },
        Err(_) => (axum::http::StatusCode::BAD_GATEWAY, AxumJson(serde_json::json!({"error": "Ingress unavailable"}))),
    }
}

// Helper alias to avoid confusing axum::Json with reqwest::Json
use axum::Json as AxumJson;
