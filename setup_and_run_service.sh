#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

PYTHON_CMD=""
if command_exists python3; then
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Python not found."
    exit 1
fi

echo "✅ Using Python: $PYTHON_CMD"

# 1. Install Dependencies
echo "📦 Checking Dependencies..."
$PYTHON_CMD -m pip install -r backend/python/estimation/requirements.txt

# 2. Compile Protobufs
echo "🧬 Compiling Protobufs..."
if [ -f "schemas/events.proto" ]; then
    $PYTHON_CMD -m grpc_tools.protoc -I schemas --python_out=backend/python/estimation/ schemas/events.proto
    echo "✅ Compiled events.proto"
else
    # Fallback search
    FOUND_PROTO=$(find . -name events.proto | head -n 1)
    if [ -n "$FOUND_PROTO" ]; then
        PROTO_DIR=$(dirname "$FOUND_PROTO")
        $PYTHON_CMD -m grpc_tools.protoc -I "$PROTO_DIR" --python_out=backend/python/estimation/ "$FOUND_PROTO"
        echo "✅ Compiled found events.proto"
    else
        # If the file already exists (compiled manually), warn but proceed
        if [ -f "backend/python/estimation/events_pb2.py" ]; then
             echo "⚠️ events.proto not found, but events_pb2.py exists. Proceeding..."
        else
             echo "❌ Critical: Could not find events.proto"
             exit 1
        fi
    fi
fi

# 2.5 Move Model Artifacts (Fix for FileNotFoundError)
# If trained from root, files might be here. Move them to where main.py expects them.
if [ -f "recovery_model.pth" ]; then
    echo "🚚 Moving model artifacts to proper directory..."
    mv recovery_model.pth backend/python/estimation/
    if [ -f "scaler.pkl" ]; then
        mv scaler.pkl backend/python/estimation/
    fi
    if [ -f "synthetic_data.csv" ]; then
        mv synthetic_data.csv backend/python/estimation/
    fi
    echo "✅ Artifacts moved."
elif [ -f "backend/python/estimation/recovery_model.pth" ]; then
    echo "✅ Model artifacts found in destination."
else
    echo "⚠️ Warning: Model not found. Attempting to retrain..."
    $PYTHON_CMD backend/python/estimation/train.py
fi

# 3. Run Service
echo "🚀 Starting Estimation Engine..."
$PYTHON_CMD backend/python/estimation/main.py
