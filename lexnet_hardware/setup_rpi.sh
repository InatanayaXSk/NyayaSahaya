#!/bin/bash
# LexNet Hardware Node Setup Script

echo "🔧 Initializing LexNet Hardware Node..."

# 1. Update and install system dependencies
echo "📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv libjpeg-dev zlib1g-dev libfreetype6-dev liblcms2-dev libopenjp2-7 libtiff5-dev tk-dev tcl-dev

# 2. Create virtual environment
echo "🐍 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# 3. Install Python requirements
echo "📥 Installing Python requirements..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Setup GPIO permissions (if needed)
echo "🔒 Setting up GPIO permissions..."
sudo usermod -a -G gpio,i2c,spi $USER

echo "✅ Setup complete!"
echo ""
echo "To start the Heartbeat Daemon:"
echo "   source venv/bin/activate"
echo "   python3 scripts/heartbeat_daemon.py"
echo ""
echo "To start the API Server:"
echo "   source venv/bin/activate"
echo "   uvicorn scripts.api_server:app --host 0.0.0.0 --port 8001"
