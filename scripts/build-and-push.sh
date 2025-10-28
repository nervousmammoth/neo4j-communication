#!/bin/bash

#######################################################################
# Neo4j Communication - Docker Build and Push Script
#
# This script builds the Neo4j Communication frontend Docker image and pushes it
# to Docker Hub for deployment on remote servers.
#
# Usage: ./build-and-push.sh [options]
#
# Options:
#   -u, --username <username>   Docker Hub username (default: yourusername)
#   -t, --tag <tag>             Image tag (default: latest)
#   -a, --also-tag <tag>        Additional tag (can be used multiple times)
#   --no-cache                  Build without using cache
#   --no-push                   Build only, don't push to Docker Hub
#   --help                      Show this help message
#
# Examples:
#   ./build-and-push.sh
#   ./build-and-push.sh -t v1.0.0 -a latest
#   ./build-and-push.sh --username myuser --tag develop --no-push
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
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Default values
DOCKER_USERNAME="yourusername"
IMAGE_TAG="latest"
ADDITIONAL_TAGS=()
NO_CACHE=false
NO_PUSH=false

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
        -a|--also-tag)
            ADDITIONAL_TAGS+=("$2")
            shift 2
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --no-push)
            NO_PUSH=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -u, --username <username>   Docker Hub username (default: yourusername)"
            echo "  -t, --tag <tag>             Image tag (default: latest)"
            echo "  -a, --also-tag <tag>        Additional tag (can be used multiple times)"
            echo "  --no-cache                  Build without using cache"
            echo "  --no-push                   Build only, don't push to Docker Hub"
            echo "  --help                      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0"
            echo "  $0 -t v1.0.0 -a latest"
            echo "  $0 --username myuser --tag develop --no-push"
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
echo -e "${CYAN}║     Neo4j Communication Docker Build & Push               ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Build image name
IMAGE_NAME="${DOCKER_USERNAME}/neo4j-communication"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${BLUE}Configuration:${NC}"
echo -e "  Docker Hub User: ${GREEN}${DOCKER_USERNAME}${NC}"
echo -e "  Image Name:      ${GREEN}${IMAGE_NAME}${NC}"
echo -e "  Primary Tag:     ${GREEN}${IMAGE_TAG}${NC}"
if [ ${#ADDITIONAL_TAGS[@]} -gt 0 ]; then
    echo -e "  Additional Tags: ${GREEN}${ADDITIONAL_TAGS[*]}${NC}"
fi
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

# Check if Dockerfile exists
if [ ! -f "$FRONTEND_DIR/Dockerfile" ]; then
    echo -e "${RED}❌ Dockerfile not found at: $FRONTEND_DIR/Dockerfile${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dockerfile found${NC}"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker daemon is running${NC}"

# Check if logged into Docker Hub (only if pushing)
if [ "$NO_PUSH" = false ]; then
    if ! docker info 2>/dev/null | grep -q "Username:"; then
        echo -e "${YELLOW}⚠️  Not logged into Docker Hub${NC}"
        echo ""
        read -p "Would you like to log in now? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            echo -e "${BLUE}🔑 Logging into Docker Hub...${NC}"
            docker login
        else
            echo -e "${RED}❌ Cannot push without Docker Hub login${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Logged into Docker Hub${NC}"
    fi
fi

echo ""

#######################################################################
# Step 2: Build Docker Image
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Building Docker Image${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$FRONTEND_DIR"

echo -e "${BLUE}🔧 Building image: ${GREEN}${FULL_IMAGE}${NC}"
echo -e "${YELLOW}   This may take 2-5 minutes...${NC}"
echo ""

# Build command
BUILD_CMD="docker build -t ${FULL_IMAGE}"

# Add additional tags to build command
for tag in "${ADDITIONAL_TAGS[@]}"; do
    BUILD_CMD="${BUILD_CMD} -t ${IMAGE_NAME}:${tag}"
done

# Add no-cache flag if specified
if [ "$NO_CACHE" = true ]; then
    BUILD_CMD="${BUILD_CMD} --no-cache"
fi

# Add current directory
BUILD_CMD="${BUILD_CMD} ."

# Execute build
eval $BUILD_CMD

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Display image size
IMAGE_SIZE=$(docker images "${IMAGE_NAME}" --format "{{.Size}}" | head -n 1)
echo -e "${BLUE}📦 Image size: ${GREEN}${IMAGE_SIZE}${NC}"

echo ""

#######################################################################
# Step 3: Push to Docker Hub
#######################################################################

if [ "$NO_PUSH" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 3: Pushing to Docker Hub${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Push primary tag
    echo -e "${BLUE}🚀 Pushing ${GREEN}${FULL_IMAGE}${NC}"
    docker push "${FULL_IMAGE}"

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Docker push failed${NC}"
        exit 1
    fi

    # Push additional tags
    for tag in "${ADDITIONAL_TAGS[@]}"; do
        echo -e "${BLUE}🚀 Pushing ${GREEN}${IMAGE_NAME}:${tag}${NC}"
        docker push "${IMAGE_NAME}:${tag}"
    done

    echo ""
    echo -e "${GREEN}✅ Successfully pushed to Docker Hub${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping push (--no-push flag set)${NC}"
fi

echo ""

#######################################################################
# Build Complete
#######################################################################

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  ✅ Build Complete!                                        ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}📊 Image Information:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Image: ${GREEN}${FULL_IMAGE}${NC}"
if [ ${#ADDITIONAL_TAGS[@]} -gt 0 ]; then
    for tag in "${ADDITIONAL_TAGS[@]}"; do
        echo -e "  Also:  ${GREEN}${IMAGE_NAME}:${tag}${NC}"
    done
fi
echo -e "  Size:  ${GREEN}${IMAGE_SIZE}${NC}"
echo ""

if [ "$NO_PUSH" = false ]; then
    echo -e "${CYAN}🚀 Deployment Commands:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  On production server:"
    echo -e "    ${GREEN}docker pull ${FULL_IMAGE}${NC}"
    echo -e "    ${GREEN}cd neo4j-docker-setup && docker compose up -d${NC}"
    echo ""
    echo -e "  Or use the deployment script:"
    echo -e "    ${GREEN}./scripts/deploy-production-docker.sh${NC}"
else
    echo -e "${CYAN}🧪 Test Locally:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  Run the image:"
    echo -e "    ${GREEN}docker run -p 3000:3000 ${FULL_IMAGE}${NC}"
fi

echo ""
echo -e "${GREEN}✨ Success!${NC}"
echo ""
