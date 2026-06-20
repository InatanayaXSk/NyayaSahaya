#!/bin/bash
# Script to start the LexNet Hardware API Server on the Raspberry Pi
# Usage: ./run_hardware.sh

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set Python Path to include the script directory for imports
export PYTHONPATH=$DIR

echo "📡 Starting LexNet Hardware API on 0.0.0.0:8001..."
echo "Node Identity: Raspberry Pi (Legal Node)"

# Run using uvicorn
# --host 0.0.0.0 is critical for the backend to find the RPi
# --port 8001 matches the backend .env
uvicorn api_server:app --host 0.0.0.0 --port 8001 --log-level info
