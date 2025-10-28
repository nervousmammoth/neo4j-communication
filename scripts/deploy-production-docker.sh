#!/bin/bash

#######################################################################
# Neo4j Communication - Production Docker Deployment Script
#
# This script pulls the latest Docker image from Docker Hub and
# deploys it on the production server using docker compose.
#
# Usage: ./deploy-production-docker.sh [options]
#
# Options:
#   -u, --username <username>   Docker Hub username (default: yourusername)
#   -t, --tag <tag>             Image tag to deploy (default: latest)
#   --no-pull                   Don't pull, use existing local image
#   --build                     Build locally instead of pulling
#   --help                      Show this help message
#######################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/data-scripts"

# Default values
DOCKER_USERNAME="yourusername"
IMAGE_TAG="latest"
NO_PULL=false
BUILD_LOCAL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--username)
            DOCKER_USERNAME="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --no-pull)
            NO_PULL=true
            shift
            ;;
        --build)
            BUILD_LOCAL=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -u, --username <username>   Docker Hub username (default: yourusername)"
            echo "  -t, --tag <tag>             Image tag to deploy (default: latest)"
            echo "  --no-pull                   Don't pull, use existing local image"
            echo "  --build                     Build locally instead of pulling"
            echo "  --help                      Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}║   Neo4j Communication Production Docker Deployment        ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Build image name
IMAGE_NAME="${DOCKER_USERNAME}/neo4j-communication:${IMAGE_TAG}"

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Docker Hub User: ${GREEN}${DOCKER_USERNAME}${NC}"
echo -e "  Image Tag:       ${GREEN}${IMAGE_TAG}${NC}"
echo -e "  Full Image:      ${GREEN}${IMAGE_NAME}${NC}"
echo ""

#######################################################################
# Step 1: Pre-flight Checks
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Pre-flight Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is installed${NC}"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker daemon is running${NC}"

# Check if docker-compose.yml exists
if [ ! -f "$DOCKER_DIR/docker-compose.yml" ]; then
    echo -e "${RED}❌ docker-compose.yml not found at: $DOCKER_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ docker-compose.yml found${NC}"

# Check if Neo4j container is running
if ! docker ps | grep -q neo4j-communication-neo4j; then
    echo -e "${YELLOW}⚠️  Neo4j container is not running${NC}"
    echo ""
    read -p "Start Neo4j now? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        cd "$DOCKER_DIR"
        echo -e "${BLUE}🚀 Starting Neo4j...${NC}"
        docker compose up -d neo4j

        # Wait for Neo4j to be healthy
        echo -e "${BLUE}⏳ Waiting for Neo4j to be ready...${NC}"
        timeout=60
        elapsed=0
        while [ $elapsed -lt $timeout ]; do
            if docker ps --filter "name=neo4j-communication-neo4j" --filter "health=healthy" | grep -q neo4j-communication-neo4j; then
                echo -e "${GREEN}✅ Neo4j is ready${NC}"
                break
            fi
            sleep 2
            elapsed=$((elapsed + 2))
            echo -n "."
        done

        if [ $elapsed -ge $timeout ]; then
            echo -e "${RED}❌ Neo4j failed to start within $timeout seconds${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Cannot proceed without Neo4j${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Neo4j is running${NC}"
fi

echo ""

#######################################################################
# Step 2: Pull/Build Image
#######################################################################

if [ "$BUILD_LOCAL" = true ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 2: Building Local Image${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo -e "${BLUE}🔧 Building image locally...${NC}"
    echo -e "${YELLOW}   This may take 2-5 minutes...${NC}"
    echo ""

    cd "$DOCKER_DIR"

    # Temporarily modify docker-compose.yml to build instead of pull
    export DOCKER_USERNAME
    export IMAGE_TAG
    docker compose build neo4j-communication-frontend

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Docker build failed${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Image built successfully${NC}"

elif [ "$NO_PULL" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 2: Pulling Latest Image${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo -e "${BLUE}📥 Pulling ${GREEN}${IMAGE_NAME}${NC}"
    echo -e "${YELLOW}   This may take 1-3 minutes depending on network speed...${NC}"
    echo ""

    docker pull "${IMAGE_NAME}"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Docker pull failed${NC}"
        echo -e "${YELLOW}💡 Tip: Make sure you're logged into Docker Hub if this is a private image${NC}"
        echo -e "${YELLOW}   Run: docker login${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Image pulled successfully${NC}"
else
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 2: Using Existing Local Image${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Check if image exists locally
    if ! docker images | grep -q "${DOCKER_USERNAME}/neo4j-communication"; then
        echo -e "${RED}❌ Image not found locally${NC}"
        echo -e "${YELLOW}💡 Tip: Run without --no-pull to download the image${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Using existing local image${NC}"
fi

echo ""

#######################################################################
# Step 3: Deploy with Docker Compose
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Deploying with Docker Compose${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$DOCKER_DIR"

# Export environment variables for docker-compose
export DOCKER_USERNAME
export IMAGE_TAG

echo -e "${BLUE}🚀 Starting services...${NC}"

# Start services (this will recreate the frontend container)
docker compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Services started${NC}"

# Wait for frontend to be healthy
echo ""
echo -e "${BLUE}⏳ Waiting for frontend to be ready...${NC}"
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker ps --filter "name=neo4j-communication-frontend" --filter "health=healthy" | grep -q neo4j-communication-frontend; then
        echo -e "${GREEN}✅ Frontend is ready${NC}"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
done

if [ $elapsed -ge $timeout ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Frontend health check timeout (this is normal for first startup)${NC}"
    echo -e "${BLUE}💡 Check logs: docker logs neo4j-communication-frontend${NC}"
fi

echo ""

#######################################################################
# Deployment Complete
#######################################################################

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  ✅ Deployment Complete!                                   ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}📊 Access Information:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  🌐 Frontend:          ${GREEN}http://localhost:3000${NC}"
echo -e "  📊 Neo4j Browser:     ${GREEN}http://localhost:7474${NC}"
echo -e "  ❤️  Health Check:      ${GREEN}http://localhost:3000/api/health${NC}"
echo ""

echo -e "${CYAN}🔍 Useful Commands:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  View logs:            ${GREEN}docker logs neo4j-communication-frontend${NC}"
echo -e "  Follow logs:          ${GREEN}docker logs -f neo4j-communication-frontend${NC}"
echo -e "  View all containers:  ${GREEN}docker compose ps${NC}"
echo -e "  Restart services:     ${GREEN}docker compose restart${NC}"
echo -e "  Stop services:        ${GREEN}docker compose down${NC}"
echo ""

echo -e "${GREEN}✨ Your application is now running!${NC}"
echo ""
