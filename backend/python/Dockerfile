FROM python:3.9-slim

WORKDIR /app

# Install system dependencies (if any needed for numpy/torch, but usually wheels are fine)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/python/estimation/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy schemas for proto compilation
COPY schemas /app/schemas

# Copy backend code
COPY backend/python /app/backend/python

# Compile Protos (mimicking setup_and_run_service.sh)
RUN python -m grpc_tools.protoc -I /app/schemas --python_out=/app/backend/python/estimation/ /app/schemas/events.proto

# Set PYTHONPATH so internal imports work
ENV PYTHONPATH="${PYTHONPATH}:/app/backend/python/estimation"

# Working directory for execution
WORKDIR /app/backend/python/estimation

# Command to run the service
CMD ["python", "main.py"]
