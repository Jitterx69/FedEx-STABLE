#!/bin/bash

echo "🐳 Checking Docker Status..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️ Docker is not running. Attempting to start Docker Desktop..."
    open -a Docker
    
    echo "⏳ Waiting for Docker to start (this may take a minute)..."
    # Wait loop
    while ! docker info > /dev/null 2>&1; do
        printf "."
        sleep 2
    done
    echo ""
    echo "✅ Docker is now running!"
else
    echo "✅ Docker is already running."
fi

# Run Docker Compose
echo "🚀 Starting Infrastructure (Kafka, Postgres, Redis)..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ Infrastructure is UP."
    echo "📜 You can now run the service: sh setup_and_run_service.sh"
else
    echo "❌ Failed to start infrastructure."
    exit 1
fi
