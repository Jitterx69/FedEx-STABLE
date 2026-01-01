# Build Stage
# Build Stage
FROM rustlang/rust:nightly as builder

WORKDIR /usr/src/app

# Install build dependencies
RUN apt-get update && apt-get install -y cmake pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy workspace definition
COPY Cargo.toml Cargo.lock ./

# Copy backend source
COPY backend backend

# Build all binaries in the workspace
RUN cargo build --release --workspace

# Runtime Stage
FROM debian:bookworm-slim

# Install dependencies needed for some crates (e.g. OpenSSL, ca-certificates)
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/local/bin

# Copy binaries from builder
# We expect binaries for: gateway, ingress, admin, regulator, projection, lifecycle, assignment
COPY --from=builder /usr/src/app/target/release/gateway .
COPY --from=builder /usr/src/app/target/release/ingress .
COPY --from=builder /usr/src/app/target/release/admin .
COPY --from=builder /usr/src/app/target/release/regulator .
# Add others if they exist and compile to binaries. The workspace defines them, so they should be there.
# If they don't produce a binary (lib only), this copy will fail, but main.rs indicates they are binaries.
COPY --from=builder /usr/src/app/target/release/projection .
COPY --from=builder /usr/src/app/target/release/assignment .

# Expose ports (although only gateway 8080, ingress 3000, admin 3001 bind ports)
EXPOSE 8080 3000 3001

# Default command can be overridden in docker-compose
CMD ["gateway"]
