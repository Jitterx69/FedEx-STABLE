# Build Stage
# Build Stage
FROM rustlang/rust:nightly as builder

WORKDIR /usr/src/app

# Install build dependencies
RUN apt-get update && apt-get install -y cmake pkg-config libssl-dev protobuf-compiler && rm -rf /var/lib/apt/lists/*

# Copy workspace definition
COPY Cargo.toml Cargo.lock ./

# Copy backend source
COPY backend backend
COPY schemas schemas

# Build all binaries in the workspace
RUN cargo build --release --workspace

# Runtime Stage
FROM debian:sid-slim

# Install dependencies needed for some crates (e.g. OpenSSL, ca-certificates)
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/local/bin

# Copy binaries from builder
# We expect binaries for: gateway, ingress, admin, regulator, projection, lifecycle, assignment
# Copy binaries from builder
# We expect binaries for: gateway, ingress, admin, regulator, projection, lifecycle, assignment
COPY --from=builder /usr/src/app/target/release/stable-gateway ./gateway
COPY --from=builder /usr/src/app/target/release/stable-ingress ./ingress
COPY --from=builder /usr/src/app/target/release/stable-admin ./admin
COPY --from=builder /usr/src/app/target/release/stable-regulator ./regulator
# Add others if they exist and compile to binaries. The workspace defines them, so they should be there.
# If they don't produce a binary (lib only), this copy will fail, but main.rs indicates they are binaries.
COPY --from=builder /usr/src/app/target/release/stable-projection ./projection
COPY --from=builder /usr/src/app/target/release/stable-assignment ./assignment
COPY --from=builder /usr/src/app/target/release/stable-lifecycle ./lifecycle

# Expose ports (although only gateway 8080, ingress 3000, admin 3001 bind ports)
EXPOSE 8080 3000 3001

# Default command can be overridden in docker-compose
CMD ["gateway"]
