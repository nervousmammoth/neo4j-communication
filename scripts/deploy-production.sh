#!/bin/bash

#######################################################################
# Neo4j Communication - Production Deployment Script
#
# This script prepares and deploys Neo4j Communication in production mode with PM2
# process manager for stability and auto-restart capabilities.
#
# Usage: ./deploy-production.sh [options]
#
# Options:
#   --rebuild           Force rebuild even if .next exists
#   --no-pm2            Just build, don't start with PM2
#   --help              Show this help message
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

# Default options
FORCE_REBUILD=false
NO_PM2=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            FORCE_REBUILD=true
            shift
            ;;
        --no-pm2)
            NO_PM2=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --rebuild           Force rebuild even if .next exists"
            echo "  --no-pm2            Just build, don't start with PM2"
            echo "  --help              Show this help message"
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
echo -e "${CYAN}║     Neo4j Communication Production Deployment             ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

#######################################################################
# Step 1: Pre-flight Checks
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Pre-flight Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found at: $FRONTEND_DIR${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${RED}❌ Dependencies not installed${NC}"
    echo -e "${YELLOW}   Please run: cd frontend && npm install${NC}"
    exit 1
fi

# Check if .env.local exists
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo -e "${RED}❌ Environment file not found: $FRONTEND_DIR/.env.local${NC}"
    echo -e "${YELLOW}   Please run: ./scripts/deploy-ubuntu.sh to set up environment${NC}"
    exit 1
fi

# Check if Neo4j is running
if ! docker ps | grep -q neo4j-communication-neo4j; then
    echo -e "${YELLOW}⚠️  Neo4j container is not running${NC}"
    echo ""
    read -p "Start Neo4j now? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        cd "$PROJECT_ROOT/data-scripts"
        ./setup-neo4j.sh
    else
        echo -e "${RED}❌ Cannot proceed without Neo4j${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Pre-flight checks passed${NC}"
echo ""

#######################################################################
# Step 2: Build for Production
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Building for Production${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$FRONTEND_DIR"

if [ "$FORCE_REBUILD" = true ] || [ ! -d ".next" ]; then
    if [ "$FORCE_REBUILD" = true ]; then
        echo -e "${BLUE}🔧 Force rebuild requested, cleaning .next directory...${NC}"
        rm -rf .next
    else
        echo -e "${BLUE}🔧 No production build found, building...${NC}"
    fi

    echo -e "${BLUE}📦 Running: npm run build${NC}"
    echo -e "${YELLOW}   This may take 1-2 minutes...${NC}"
    echo ""

    npm run build

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}✅ Production build complete${NC}"
else
    echo -e "${GREEN}✅ Production build already exists (use --rebuild to force rebuild)${NC}"
fi

echo ""

#######################################################################
# Step 3: PM2 Setup and Deployment
#######################################################################

if [ "$NO_PM2" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 3: PM2 Process Manager Setup${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}⚠️  PM2 is not installed${NC}"
        echo ""
        read -p "Install PM2 globally now? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            echo -e "${BLUE}📦 Installing PM2...${NC}"
            npm install -g pm2
            echo -e "${GREEN}✅ PM2 installed${NC}"
        else
            echo -e "${YELLOW}⚠️  Skipping PM2 setup${NC}"
            echo -e "${BLUE}💡 To start manually: cd frontend && npm start${NC}"
            exit 0
        fi
    else
        echo -e "${GREEN}✅ PM2 is already installed${NC}"
    fi

    echo ""

    # Stop any existing processes with the same name
    if pm2 list | grep -q neo4j-communication-frontend; then
        echo -e "${BLUE}🛑 Stopping existing neo4j-communication-frontend processes...${NC}"
        pm2 delete neo4j-communication-frontend 2>/dev/null || true
        echo -e "${GREEN}✅ Old processes stopped${NC}"
    fi

    echo ""
    echo -e "${BLUE}🚀 Starting neo4j-communication-frontend with PM2...${NC}"

    # Start the application
    pm2 start npm --name "neo4j-communication-frontend" -- start

    # Save PM2 process list
    echo -e "${BLUE}💾 Saving PM2 configuration...${NC}"
    pm2 save

    echo ""
    echo -e "${GREEN}✅ Application started with PM2${NC}"

    # Check if PM2 startup is configured
    if ! systemctl list-unit-files | grep -q "pm2-$USER.service"; then
        echo ""
        echo -e "${YELLOW}⚠️  PM2 auto-startup is not configured${NC}"
        echo ""
        read -p "Enable PM2 auto-startup on system reboot? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            echo -e "${BLUE}🔧 Configuring PM2 startup...${NC}"
            pm2 startup | grep "sudo" | bash
            pm2 save
            echo -e "${GREEN}✅ PM2 will auto-start on reboot${NC}"
        fi
    else
        echo -e "${GREEN}✅ PM2 auto-startup already configured${NC}"
    fi

    echo ""

    # Display PM2 status
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}PM2 Process Status:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    pm2 status

    echo ""
    echo -e "${CYAN}📊 Useful PM2 Commands:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  View logs:         ${GREEN}pm2 logs neo4j-communication-frontend${NC}"
    echo -e "  View status:       ${GREEN}pm2 status${NC}"
    echo -e "  Restart app:       ${GREEN}pm2 restart neo4j-communication-frontend${NC}"
    echo -e "  Stop app:          ${GREEN}pm2 stop neo4j-communication-frontend${NC}"
    echo -e "  Delete app:        ${GREEN}pm2 delete neo4j-communication-frontend${NC}"
    echo -e "  Monitor:           ${GREEN}pm2 monit${NC}"
    echo ""
fi

#######################################################################
# Deployment Complete
#######################################################################

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  ✅ Production Deployment Complete!                        ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}📊 Access Information:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  🌐 Frontend (Production): ${GREEN}http://localhost:3000${NC}"
echo -e "  📊 Neo4j Browser:         ${GREEN}http://localhost:7474${NC}"
echo ""

if [ "$NO_PM2" = false ]; then
    echo -e "${CYAN}🔍 Monitoring:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  Check logs:        ${GREEN}pm2 logs neo4j-communication-frontend${NC}"
    echo -e "  Monitor realtime:  ${GREEN}pm2 monit${NC}"
    echo ""
fi

echo -e "${GREEN}✨ Your application is now running in production mode!${NC}"
echo ""
