#!/bin/bash

# Teardown Neo4j for Neo4j Communication Development
# This script stops and removes the Neo4j container

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DOCKER_COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

echo "🛑 Stopping Neo4j for Neo4j Communication development..."

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

# Stop Neo4j container
echo "📦 Stopping Neo4j container..."
docker compose -f "$DOCKER_COMPOSE_FILE" down

# Optional: Remove volumes (uncomment to also delete data)
# echo "🗑️  Removing Neo4j volumes..."
# docker compose -f "$DOCKER_COMPOSE_FILE" down -v

echo "✅ Neo4j has been stopped successfully!"
echo ""
echo "Note: The data volume is preserved. To completely remove all data, run:"
echo "  docker compose -f $DOCKER_COMPOSE_FILE down -v"