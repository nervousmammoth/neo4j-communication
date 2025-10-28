#!/bin/bash

#######################################################################
# Neo4j Communication - Docker Permission Fix Script
#
# This script diagnoses and fixes common Docker daemon and permission
# issues on Ubuntu/Linux systems.
#
# Usage: sudo ./fix-docker-permissions.sh
#######################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Neo4j Communication Docker Diagnostics & Fix                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

#######################################################################
# Step 1: Check if Docker is installed
#######################################################################

echo -e "${BLUE}🔍 Step 1: Checking Docker installation...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is NOT installed${NC}"
    echo ""
    echo -e "${YELLOW}To install Docker, run:${NC}"
    echo -e "  sudo ./scripts/install-ubuntu-dependencies.sh"
    echo ""
    exit 1
fi

DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
echo -e "${GREEN}✅ Docker is installed (version $DOCKER_VERSION)${NC}"
echo ""

#######################################################################
# Step 2: Check Docker daemon status
#######################################################################

echo -e "${BLUE}🔍 Step 2: Checking Docker daemon status...${NC}"

# Check if systemd is available
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet docker; then
        echo -e "${GREEN}✅ Docker daemon is running${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker daemon is not running${NC}"
        echo -e "${BLUE}   Starting Docker daemon...${NC}"

        if systemctl start docker 2>&1; then
            echo -e "${GREEN}✅ Docker daemon started successfully${NC}"
        else
            echo -e "${RED}❌ Failed to start Docker daemon${NC}"
            echo -e "${YELLOW}   Try manually: sudo systemctl start docker${NC}"
            exit 1
        fi
    fi

    # Enable Docker to start on boot
    if ! systemctl is-enabled --quiet docker; then
        echo -e "${BLUE}   Enabling Docker to start on boot...${NC}"
        systemctl enable docker
        echo -e "${GREEN}✅ Docker will start automatically on boot${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  systemd not available (possibly WSL or container)${NC}"
    echo -e "${YELLOW}   Check Docker daemon status manually${NC}"
fi
echo ""

#######################################################################
# Step 3: Check Docker socket permissions
#######################################################################

echo -e "${BLUE}🔍 Step 3: Checking Docker socket permissions...${NC}"

if [ -S /var/run/docker.sock ]; then
    SOCKET_PERMS=$(ls -l /var/run/docker.sock)
    echo -e "${GREEN}✅ Docker socket exists${NC}"
    echo -e "   Permissions: $SOCKET_PERMS"

    # Check if socket is accessible
    if [ -w /var/run/docker.sock ]; then
        echo -e "${GREEN}✅ Socket is writable${NC}"
    else
        echo -e "${YELLOW}⚠️  Socket is not writable by current user${NC}"
    fi
else
    echo -e "${RED}❌ Docker socket not found at /var/run/docker.sock${NC}"
fi
echo ""

#######################################################################
# Step 4: Check user group membership
#######################################################################

echo -e "${BLUE}🔍 Step 4: Checking user group membership...${NC}"

CURRENT_USER=${SUDO_USER:-$(whoami)}
echo -e "   Current user: ${BLUE}$CURRENT_USER${NC}"

if groups $CURRENT_USER | grep -q docker; then
    echo -e "${GREEN}✅ User '$CURRENT_USER' is in docker group${NC}"
else
    echo -e "${YELLOW}⚠️  User '$CURRENT_USER' is NOT in docker group${NC}"
    echo -e "${BLUE}   Adding user to docker group...${NC}"

    if usermod -aG docker $CURRENT_USER; then
        echo -e "${GREEN}✅ User added to docker group${NC}"
        echo -e "${YELLOW}   IMPORTANT: Log out and back in for changes to take effect${NC}"
        echo -e "${YELLOW}   Or run: newgrp docker${NC}"
    else
        echo -e "${RED}❌ Failed to add user to docker group${NC}"
        exit 1
    fi
fi
echo ""

#######################################################################
# Step 5: Test Docker access
#######################################################################

echo -e "${BLUE}🔍 Step 5: Testing Docker access...${NC}"

# Test as root first
if docker info &> /dev/null; then
    echo -e "${GREEN}✅ Docker works with sudo/root${NC}"
else
    echo -e "${RED}❌ Docker doesn't work even with sudo${NC}"
    echo -e "${YELLOW}   Docker daemon may not be running properly${NC}"
    exit 1
fi

# Test as regular user (if not root)
if [ "$CURRENT_USER" != "root" ]; then
    if sudo -u $CURRENT_USER docker ps &> /dev/null; then
        echo -e "${GREEN}✅ Docker works for user '$CURRENT_USER'${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker doesn't work for user '$CURRENT_USER' yet${NC}"
        echo -e "${YELLOW}   User needs to log out and back in, or run: newgrp docker${NC}"
    fi
fi
echo ""

#######################################################################
# Summary and Next Steps
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Docker Diagnostics Complete                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "1. If you were added to the docker group, log out and back in"
echo -e "   ${YELLOW}OR run this to activate the group in current shell:${NC}"
echo -e "   ${BLUE}newgrp docker${NC}"
echo ""
echo -e "2. Run the system requirements check again:"
echo -e "   ${BLUE}./scripts/check-system-requirements.sh${NC}"
echo ""
echo -e "3. If all checks pass, deploy Neo4j Communication:"
echo -e "   ${BLUE}./scripts/deploy-ubuntu.sh${NC}"
echo ""
