#!/bin/bash

#######################################################################
# Neo4j Communication - System Requirements Checker
#
# This script verifies that all required system dependencies are
# installed and properly configured before deploying Neo4j Communication.
#
# Usage: ./check-system-requirements.sh
#
# Exit codes:
#   0 - All requirements met
#   1 - One or more requirements not met
#######################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track if all checks pass
ALL_CHECKS_PASSED=true

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Neo4j Communication System Requirements Checker                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

#######################################################################
# Helper Functions
#######################################################################

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ALL_CHECKS_PASSED=false
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

version_compare() {
    # Compare version strings (returns 0 if $1 >= $2)
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

#######################################################################
# Check Docker Installation
#######################################################################

echo -e "${BLUE}🐳 Checking Docker...${NC}"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    check_pass "Docker installed (version $DOCKER_VERSION)"

    # Check if Docker daemon is running (using systemctl)
    if systemctl is-active --quiet docker 2>/dev/null || sudo systemctl is-active --quiet docker 2>/dev/null; then
        check_pass "Docker daemon is running"

        # Check user permissions (only if daemon is running)
        if docker info &> /dev/null; then
            check_pass "Docker permissions configured (can run without sudo)"
        else
            check_warn "Cannot access Docker without sudo (daemon is running but needs permissions)"
            echo -e "   ${YELLOW}Run: sudo usermod -aG docker \$USER && newgrp docker${NC}"
            echo -e "   ${YELLOW}Or log out and log back in for group changes to take effect${NC}"
        fi
    else
        check_fail "Docker daemon is not running"
        echo -e "   ${RED}Start Docker: sudo systemctl start docker${NC}"
    fi
else
    check_fail "Docker is not installed"
    echo -e "   ${RED}Install with: sudo ./scripts/install-ubuntu-dependencies.sh${NC}"
fi

#######################################################################
# Check Docker Compose
#######################################################################

echo ""
echo -e "${BLUE}🐳 Checking Docker Compose...${NC}"

if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || docker compose version | grep -oP '\d+\.\d+\.\d+' | head -1)
    check_pass "Docker Compose installed (version $COMPOSE_VERSION)"

    # Minimum version check (2.0.0+)
    if version_compare "$COMPOSE_VERSION" "2.0.0"; then
        check_pass "Docker Compose version is sufficient (>= 2.0.0)"
    else
        check_warn "Docker Compose version is old (found $COMPOSE_VERSION, recommended >= 2.0.0)"
    fi
else
    check_fail "Docker Compose is not installed"
    echo -e "   ${RED}Install with: sudo ./scripts/install-ubuntu-dependencies.sh${NC}"
fi

#######################################################################
# Check Node.js
#######################################################################

echo ""
echo -e "${BLUE}📦 Checking Node.js...${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

    check_pass "Node.js installed (version $NODE_VERSION)"

    # Check minimum version (18+)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        check_pass "Node.js version is sufficient (>= 18.0.0)"
    else
        check_fail "Node.js version is too old (found $NODE_VERSION, required >= 18.0.0)"
        echo -e "   ${RED}Upgrade with: sudo ./scripts/install-ubuntu-dependencies.sh${NC}"
    fi
else
    check_fail "Node.js is not installed"
    echo -e "   ${RED}Install with: sudo ./scripts/install-ubuntu-dependencies.sh${NC}"
fi

#######################################################################
# Check npm
#######################################################################

echo ""
echo -e "${BLUE}📦 Checking npm...${NC}"

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed (version $NPM_VERSION)"

    # Check minimum version (8+)
    NPM_MAJOR=$(echo $NPM_VERSION | cut -d'.' -f1)
    if [ "$NPM_MAJOR" -ge 8 ]; then
        check_pass "npm version is sufficient (>= 8.0.0)"
    else
        check_warn "npm version is old (found $NPM_VERSION, recommended >= 8.0.0)"
        echo -e "   ${YELLOW}Upgrade with: npm install -g npm@latest${NC}"
    fi
else
    check_fail "npm is not installed"
    echo -e "   ${RED}npm should be installed with Node.js${NC}"
fi

#######################################################################
# Check Git
#######################################################################

echo ""
echo -e "${BLUE}📦 Checking Git...${NC}"

if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    check_pass "Git installed (version $GIT_VERSION)"
else
    check_warn "Git is not installed (optional, but recommended)"
    echo -e "   ${YELLOW}Install with: sudo apt-get install git${NC}"
fi

#######################################################################
# Check Port Availability
#######################################################################

echo ""
echo -e "${BLUE}🔌 Checking port availability...${NC}"

check_port() {
    local PORT=$1
    local SERVICE=$2

    if command -v nc &> /dev/null; then
        if nc -z localhost $PORT 2>/dev/null; then
            check_warn "Port $PORT is in use (needed for $SERVICE)"
            echo -e "   ${YELLOW}Check with: sudo lsof -i :$PORT${NC}"
        else
            check_pass "Port $PORT is available ($SERVICE)"
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$PORT "; then
            check_warn "Port $PORT is in use (needed for $SERVICE)"
            echo -e "   ${YELLOW}Check with: sudo netstat -tuln | grep $PORT${NC}"
        else
            check_pass "Port $PORT is available ($SERVICE)"
        fi
    else
        check_warn "Cannot check port $PORT (netcat or netstat not available)"
    fi
}

check_port 7474 "Neo4j Browser"
check_port 7687 "Neo4j Bolt"
check_port 3000 "Frontend"

#######################################################################
# Check Disk Space
#######################################################################

echo ""
echo -e "${BLUE}💾 Checking disk space...${NC}"

AVAILABLE_GB=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')

if [ "$AVAILABLE_GB" -ge 10 ]; then
    check_pass "Sufficient disk space available (${AVAILABLE_GB}GB free)"
elif [ "$AVAILABLE_GB" -ge 5 ]; then
    check_warn "Low disk space (${AVAILABLE_GB}GB free, recommended >= 10GB)"
else
    check_fail "Insufficient disk space (${AVAILABLE_GB}GB free, minimum 5GB required)"
fi

#######################################################################
# Check Memory
#######################################################################

echo ""
echo -e "${BLUE}💻 Checking system memory...${NC}"

TOTAL_MEM_GB=$(free -g | awk '/^Mem:/{print $2}')
AVAILABLE_MEM_GB=$(free -g | awk '/^Mem:/{print $7}')

if [ "$TOTAL_MEM_GB" -ge 4 ]; then
    check_pass "Sufficient total memory (${TOTAL_MEM_GB}GB)"
elif [ "$TOTAL_MEM_GB" -ge 2 ]; then
    check_warn "Low total memory (${TOTAL_MEM_GB}GB, recommended >= 4GB)"
else
    check_warn "Very low total memory (${TOTAL_MEM_GB}GB, minimum 2GB recommended)"
fi

if [ "$AVAILABLE_MEM_GB" -ge 2 ]; then
    check_pass "Sufficient available memory (${AVAILABLE_MEM_GB}GB free)"
else
    check_warn "Low available memory (${AVAILABLE_MEM_GB}GB free)"
fi

#######################################################################
# Summary
#######################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ All System Requirements Met!                           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}🚀 You're ready to deploy Neo4j Communication!${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. ${BLUE}cd $PROJECT_ROOT${NC}"
    echo -e "  2. ${BLUE}./scripts/deploy-ubuntu.sh${NC}  # Automated deployment"
    echo ""
    echo -e "Or manually:"
    echo -e "  1. ${BLUE}cd data-scripts && ./setup-neo4j.sh${NC}"
    echo -e "  2. ${BLUE}npm install && node seed-data.js${NC}"
    echo -e "  3. ${BLUE}cd ../frontend && npm install${NC}"
    echo -e "  4. ${BLUE}npm run dev${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ System Requirements Check Failed                       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Please install missing dependencies${NC}"
    echo ""
    echo -e "Quick fix:"
    echo -e "  ${BLUE}sudo ./scripts/install-ubuntu-dependencies.sh${NC}"
    echo ""
    echo -e "Then run this check again:"
    echo -e "  ${BLUE}./scripts/check-system-requirements.sh${NC}"
    echo ""
    exit 1
fi
