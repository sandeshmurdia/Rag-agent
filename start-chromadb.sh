#!/bin/bash

# Start Local ChromaDB Server
# This script starts a local ChromaDB server for the RAG system

echo "🚀 Starting Local ChromaDB Server..."
echo "====================================="

# Check if virtual environment exists
if [ ! -d "chromadb-env" ]; then
    echo "❌ ChromaDB virtual environment not found!"
    echo "Please run the setup first:"
    echo "1. python3 -m venv chromadb-env"
    echo "2. source chromadb-env/bin/activate"
    echo "3. pip install chromadb"
    exit 1
fi

# Activate virtual environment and start server
echo "✅ Activating ChromaDB environment..."
source chromadb-env/bin/activate

echo "✅ Starting ChromaDB server on http://localhost:8000..."
echo "📝 Press Ctrl+C to stop the server"
echo ""

# Start ChromaDB server
python3 -m chromadb.server --host localhost --port 8000
