#!/bin/bash
echo "Stopping all background cargo processes..."
export DATABASE_URL=postgres://stable_user:stable_password@localhost:5435/stable_core

pkill -f "cargo run" || true
pkill -f "target/debug/stable-" || true

echo "Waiting for ports to clear..."
sleep 5

echo "Starting Backend Services..."
# Start Ingress
nohup cargo run -p stable-ingress > ingress.log 2>&1 &
echo "Started Ingress (PID $!)"
sleep 2

# Start Admin
nohup cargo run -p stable-admin > admin.log 2>&1 &
echo "Started Admin (PID $!)"
sleep 2

# Start Regulator
nohup cargo run -p stable-regulator > regulator.log 2>&1 &
echo "Started Regulator (PID $!)"
sleep 2

# Start Projection
nohup cargo run -p stable-projection > projection.log 2>&1 &
echo "Started Projection (PID $!)"
sleep 2

# Start Gateway
nohup cargo run -p stable-gateway > gateway.log 2>&1 &
echo "Started Gateway (PID $!)"
sleep 2

echo "All services restarted. Logs are being written to *.log files."
