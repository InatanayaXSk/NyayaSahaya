#!/bin/bash
# Script to start the Dummy LexNet Hardware API Server
# Usage: ./run_dummy_hardware.sh

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set Python Path to include the script directory for imports
export PYTHONPATH=$DIR

echo "📡 Starting Dummy LexNet Hardware API on 0.0.0.0:8002..."
echo "Node Identity: Dummy Mock Server"

# Run using uvicorn via uv
uv run uvicorn dummy_api_server:app --host 0.0.0.0 --port 8002 --log-level info
