#!/bin/bash

# Setup Neo4j for Neo4j Communication Development
# This script starts a Neo4j container using Docker Compose

set -e

# Neo4j credentials
NEO4J_USER="neo4j"
NEO4J_PASSWORD="changeme123"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DOCKER_COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

echo "🚀 Starting Neo4j for Neo4j Communication development..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo "❌ Docker Compose file not found at: $DOCKER_COMPOSE_FILE"
    exit 1
fi

# Stop any existing Neo4j container
echo "📦 Checking for existing Neo4j containers..."
if docker ps -q -f name=neo4j-communication-neo4j > /dev/null 2>&1; then
    echo "⏹️  Stopping existing Neo4j container..."
    docker compose -f "$DOCKER_COMPOSE_FILE" down
fi

# Start Neo4j container
echo "🔧 Starting Neo4j container..."
docker compose -f "$DOCKER_COMPOSE_FILE" up -d

# Wait for Neo4j to be ready
echo "⏳ Waiting for Neo4j to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if docker exec neo4j-communication-neo4j cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" "RETURN 'Connected' as status;" > /dev/null 2>&1; then
        echo "✅ Neo4j is ready!"
        break
    fi
    
    echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS - Neo4j is starting..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "❌ Neo4j failed to start after $MAX_ATTEMPTS attempts"
    exit 1
fi

# Display connection information
echo ""
echo "🎉 Neo4j is running successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Neo4j Browser: http://localhost:7474"
echo "🔌 Bolt URL: bolt://localhost:7687"
echo "👤 Username: $NEO4J_USER"
echo "🔑 Password: $NEO4J_PASSWORD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Run 'npm install' in the frontend directory if not done already"
echo "2. Run './seed-data.js' to populate the database with test data"
echo "3. Start the frontend with 'npm run dev' in the frontend directory"