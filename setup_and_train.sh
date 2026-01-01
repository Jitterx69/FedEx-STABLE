#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "Detected Environment Issue. Attempting to locate Python..."

PYTHON_CMD=""

if command_exists python3; then
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Neither 'python3' nor 'python' was found. Please install Python."
    exit 1
fi

echo "✅ Using Python: $PYTHON_CMD"

# 1. Install Dependencies using python -m pip (safer than 'pip')
echo "📦 Installing Dependencies..."
$PYTHON_CMD -m pip install -r backend/python/estimation/requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Please check your internet connection or permissions."
    exit 1
fi

# 2. Run Training
echo "🧠 Training Model..."
$PYTHON_CMD backend/python/estimation/train.py

if [ $? -eq 0 ]; then
    echo "✅ Success! Model trained and saved as 'recovery_model.pth'."
else
    echo "❌ Training failed."
    exit 1
fi
