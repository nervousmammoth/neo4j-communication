#!/bin/bash

#######################################################################
# Neo4j Communication - Unified Ubuntu Deployment Script
#
# This script automates the complete deployment of Neo4j Communication on Ubuntu,
# including system checks, dependency installation, database setup,
# and frontend configuration.
#
# Usage: ./deploy-ubuntu.sh [options]
#
# Options:
#   --skip-checks       Skip system requirements check
#   --skip-seed         Skip database seeding
#   --no-start          Don't start the frontend after setup
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

# Default options
SKIP_CHECKS=false
SKIP_SEED=false
NO_START=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --no-start)
            NO_START=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --skip-checks       Skip system requirements check"
            echo "  --skip-seed         Skip database seeding"
            echo "  --no-start          Don't start the frontend after setup"
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
echo -e "${CYAN}║   Neo4j Communication Ubuntu Deployment Automation        ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

#######################################################################
# Step 1: System Requirements Check
#######################################################################

if [ "$SKIP_CHECKS" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 1: Checking System Requirements${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ -f "$SCRIPT_DIR/check-system-requirements.sh" ]; then
        if bash "$SCRIPT_DIR/check-system-requirements.sh"; then
            echo ""
            echo -e "${GREEN}✅ System requirements check passed${NC}"
        else
            echo ""
            echo -e "${YELLOW}⚠️  System requirements check failed${NC}"
            echo ""
            read -p "Do you want to install missing dependencies now? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if [ -f "$SCRIPT_DIR/install-ubuntu-dependencies.sh" ]; then
                    sudo bash "$SCRIPT_DIR/install-ubuntu-dependencies.sh"
                    echo ""
                    echo -e "${GREEN}✅ Dependencies installed. Re-running requirements check...${NC}"
                    echo ""
                    bash "$SCRIPT_DIR/check-system-requirements.sh" || {
                        echo -e "${RED}❌ System requirements still not met. Please fix the issues and try again.${NC}"
                        exit 1
                    }
                else
                    echo -e "${RED}❌ Installation script not found at: $SCRIPT_DIR/install-ubuntu-dependencies.sh${NC}"
                    exit 1
                fi
            else
                echo -e "${RED}❌ Cannot proceed without required dependencies${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  System requirements check script not found, skipping...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping system requirements check (--skip-checks)${NC}"
fi

echo ""

#######################################################################
# Step 2: Setup Environment Configuration
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Setting Up Environment Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ENV_SOURCE="$PROJECT_ROOT/data-scripts/env.local"
ENV_DEST="$PROJECT_ROOT/frontend/.env.local"

if [ ! -f "$ENV_DEST" ]; then
    if [ -f "$ENV_SOURCE" ]; then
        echo -e "${BLUE}📝 Creating frontend/.env.local from template...${NC}"
        cp "$ENV_SOURCE" "$ENV_DEST"
        echo -e "${GREEN}✅ Environment file created${NC}"
    else
        echo -e "${YELLOW}⚠️  Template not found, creating basic .env.local...${NC}"

        # Generate a random secret if openssl is available, otherwise use a placeholder
        if command -v openssl &> /dev/null; then
            SECRET=$(openssl rand -base64 32)
            echo -e "${GREEN}✅ Generated unique NEXTAUTH_SECRET${NC}"
        else
            SECRET="PLEASE_REPLACE_ME_WITH_A_SECURE_RANDOM_STRING"
            echo -e "${RED}⚠️  Warning: 'openssl' not found. A placeholder secret was used.${NC}"
            echo -e "${YELLOW}   Please generate a secure secret manually: openssl rand -base64 32${NC}"
        fi

        cat > "$ENV_DEST" <<EOF
# Application Configuration
NEXT_PUBLIC_APP_NAME=neo4j-communication
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Neo4j Database Connection
NEO4J_01_URI=bolt://localhost:7687
NEO4J_01_USER=neo4j
NEO4J_01_PASSWORD=changeme123

# Authentication (REQUIRED)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${SECRET}

# Demo User Credentials
DEMO_USER_EMAIL=demo@neo4j-communication.com
DEMO_USER_NAME=Demo User
DEMO_USER_PASSWORD_HASH=\$2a\$10\$K.0HY2ycGOOF2bEc3kKnGeQsLmRQNxUkroZvJps1b3HPRhghvNKGy

# Feature Flags
NEXT_PUBLIC_ENABLE_DARK_MODE=true
EOF
        echo -e "${GREEN}✅ Basic environment file created${NC}"
    fi
else
    echo -e "${GREEN}✅ Environment file already exists${NC}"
fi

echo ""

#######################################################################
# Step 3: Start Neo4j Container
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Starting Neo4j Database${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT/data-scripts"

if [ -f "./setup-neo4j.sh" ]; then
    echo -e "${BLUE}🐳 Starting Neo4j container...${NC}"
    bash ./setup-neo4j.sh
    echo -e "${GREEN}✅ Neo4j is running${NC}"
else
    echo -e "${RED}❌ setup-neo4j.sh not found${NC}"
    exit 1
fi

echo ""

#######################################################################
# Step 4: Install Data Scripts Dependencies
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Installing Data Scripts Dependencies${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing npm packages...${NC}"
    npm install --silent
    echo -e "${GREEN}✅ Data scripts dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Data scripts dependencies already installed${NC}"
fi

echo ""

#######################################################################
# Step 5: Seed Database
#######################################################################

if [ "$SKIP_SEED" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 5: Seeding Database with Test Data${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ -f "./seed-data.js" ]; then
        echo -e "${BLUE}🌱 Running seed script...${NC}"
        echo -e "${YELLOW}   This will create: 150 users, 1,500 conversations, ~157,500 messages${NC}"
        echo -e "${YELLOW}   Estimated time: 30-60 seconds${NC}"
        echo ""
        node seed-data.js
        echo -e "${GREEN}✅ Database seeded successfully${NC}"
    else
        echo -e "${RED}❌ seed-data.js not found${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping database seeding (--skip-seed)${NC}"
fi

echo ""

#######################################################################
# Step 6: Install Frontend Dependencies
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 6: Installing Frontend Dependencies${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing npm packages (this may take a few minutes)...${NC}"
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

echo ""

#######################################################################
# Step 7: Setup Caddy Reverse Proxy (Optional)
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 7: Setup Caddy Reverse Proxy (Optional)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}ℹ️  Caddy can act as a reverse proxy to:${NC}"
echo -e "   • Route port 80 traffic to your frontend (port 3000)"
echo -e "   • Keep Neo4j ports (7474, 7687) internal-only for security"
echo -e "   • Enable remote access to your application"
echo ""

read -p "Do you want to set up Caddy reverse proxy? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    if [ -f "$SCRIPT_DIR/setup-caddy-proxy.sh" ]; then
        echo -e "${BLUE}🔧 Setting up Caddy reverse proxy...${NC}"
        bash "$SCRIPT_DIR/setup-caddy-proxy.sh"
        CADDY_SETUP=true
        echo ""
        echo -e "${GREEN}✅ Caddy reverse proxy configured${NC}"
    else
        echo -e "${RED}❌ Caddy setup script not found at: $SCRIPT_DIR/setup-caddy-proxy.sh${NC}"
        CADDY_SETUP=false
    fi
else
    echo ""
    echo -e "${YELLOW}⏭️  Skipping Caddy setup${NC}"
    echo -e "   ${BLUE}You can set it up later with:${NC}"
    echo -e "   ${GREEN}./scripts/setup-caddy-proxy.sh${NC}"
    CADDY_SETUP=false
fi

echo ""

#######################################################################
# Deployment Complete
#######################################################################

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  ✅ Neo4j Communication Deployment Complete!               ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}📊 Access Information:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "${CADDY_SETUP:-false}" = true ]; then
    # Show Caddy proxy access
    echo -e "  🌐 Application:    ${GREEN}http://localhost${NC} (via Caddy)"
    echo -e "                     ${GREEN}http://<server-ip>${NC} (remote access)"
    echo -e "  🔧 Frontend Direct:${GREEN}http://localhost:3000${NC} (local only)"
    echo -e "  📊 Neo4j Browser:  ${GREEN}http://localhost:7474${NC} (local only)"
    echo -e "  🔌 Neo4j Bolt:     bolt://localhost:7687 (local only)"
else
    # Show standard access
    echo -e "  🌐 Frontend:       ${GREEN}http://localhost:3000${NC}"
    echo -e "  📊 Neo4j Browser:  ${GREEN}http://localhost:7474${NC}"
    echo -e "  🔌 Neo4j Bolt:     bolt://localhost:7687"
fi
echo ""
echo -e "${CYAN}🔐 Neo4j Credentials:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Username:          ${GREEN}neo4j${NC}"
echo -e "  Password:          ${GREEN}changeme123${NC}"
echo ""

#######################################################################
# Start Frontend (Optional)
#######################################################################

if [ "$NO_START" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    read -p "Start the frontend development server now? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo ""
        echo -e "${BLUE}🚀 Starting frontend...${NC}"
        echo -e "${YELLOW}   Press Ctrl+C to stop the server${NC}"
        echo ""
        npm run dev
    else
        echo ""
        echo -e "${BLUE}💡 To start the frontend later:${NC}"
        echo -e "   ${GREEN}cd $PROJECT_ROOT/frontend${NC}"
        echo -e "   ${GREEN}npm run dev${NC}"
        echo ""
    fi
else
    echo -e "${BLUE}💡 To start the frontend:${NC}"
    echo -e "   ${GREEN}cd $PROJECT_ROOT/frontend${NC}"
    echo -e "   ${GREEN}npm run dev${NC}"
    echo ""
fi

#######################################################################
# Additional Commands
#######################################################################

echo -e "${CYAN}📚 Useful Commands:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Start frontend:        ${GREEN}cd frontend && npm run dev${NC}"
echo -e "  Stop Neo4j:            ${GREEN}cd data-scripts && ./teardown-neo4j.sh${NC}"
echo -e "  Restart Neo4j:         ${GREEN}cd data-scripts && ./setup-neo4j.sh${NC}"
echo -e "  Re-seed database:      ${GREEN}cd data-scripts && node seed-data.js${NC}"
echo -e "  Run tests:             ${GREEN}cd frontend && npm run test:run${NC}"
echo -e "  Build for production:  ${GREEN}cd frontend && npm run build${NC}"
echo ""

echo -e "${GREEN}✨ Happy analyzing!${NC}"
