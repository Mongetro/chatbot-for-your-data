#!/bin/bash
# start.sh - Start script for non-Docker users

echo "🚀 Starting Chatbot for Your Data..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env and add your GROQ_API_KEY"
    exit 1
fi

# Create uploads directory
mkdir -p uploads

# Run the application
echo "✨ Starting server at http://localhost:8000"
python run.py