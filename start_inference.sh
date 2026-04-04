#!/bin/bash
# Script to launch llama-server with Gemma 4 model for NyayaSahaya AI backend
# Usage: ./start_inference.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_PATH="$ROOT_DIR/llama.cpp/build/bin/llama-server"
MODEL_PATH="$ROOT_DIR/llama.cpp/models/gemma-4-E4B-it-Q3_K_M.gguf"

if [ ! -f "$BIN_PATH" ]; then
    echo "Error: llama-server binary not found at $BIN_PATH"
    echo "Please ensure you have built llama.cpp."
    exit 1
fi

if [ ! -f "$MODEL_PATH" ]; then
    echo "Error: Model file not found at $MODEL_PATH"
    exit 1
fi

echo "🚀 Starting LexNet Inference Engine (llama-server) on port 8080..."
echo "Model: gemma-4-E4B-it-Q3_K_M.gguf"

# -m: path to model
# -c 4096: Context window
# --port 8080: Default API port
# -ngl 33: Offload layers to GPU
# -cb: continuous batching
# --temp 1 --top-k 64 --top-p 0.95: Model parameters from Ollama
# --reasoning-budget 80 --reasoning-budget-message "Answer now.": Thinking budget
$BIN_PATH -m $MODEL_PATH -c 4096 --port 8080 -ngl 33 -cb \
  --temp 1 --top-k 64 --top-p 0.95 \
  --reasoning-budget 80 --reasoning-budget-message "Answer now."
