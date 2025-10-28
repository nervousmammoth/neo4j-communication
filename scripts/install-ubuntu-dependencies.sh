#!/bin/bash

#######################################################################
# Neo4j Communication - Ubuntu System Dependencies Installer
#
# This script installs all system-level dependencies required to run
# Neo4j Communication on a fresh Ubuntu VM, including Docker Engine, Docker Compose,
# and Node.js 20.x.
#
# Usage: sudo ./install-ubuntu-dependencies.sh
#
# Tested on: Ubuntu 20.04, 22.04, 24.04
#######################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script must be run with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run with sudo${NC}"
    echo "Usage: sudo ./install-ubuntu-dependencies.sh"
    exit 1
fi

# Get the actual user (not root) who invoked sudo
ACTUAL_USER="${SUDO_USER:-$USER}"
ACTUAL_HOME=$(eval echo ~$ACTUAL_USER)

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Neo4j Communication Ubuntu System Dependencies Installer ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

#######################################################################
# Check OS Compatibility
#######################################################################

echo -e "${BLUE}🔍 Checking system compatibility...${NC}"

if [ ! -f /etc/os-release ]; then
    echo -e "${RED}❌ Cannot detect OS version${NC}"
    exit 1
fi

. /etc/os-release

if [ "$ID" != "ubuntu" ]; then
    echo -e "${YELLOW}⚠️  Warning: This script is designed for Ubuntu.${NC}"
    echo -e "${YELLOW}   Your OS: $ID $VERSION_ID${NC}"
    echo -e "${YELLOW}   It may still work, but proceed with caution.${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ Ubuntu ${VERSION_ID} detected${NC}"
fi

#######################################################################
# Update Package Lists
#######################################################################

echo ""
echo -e "${BLUE}📦 Updating package lists...${NC}"
apt-get update -qq

echo -e "${BLUE}📦 Installing prerequisites...${NC}"
apt-get install -y -qq \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    apt-transport-https \
    software-properties-common \
    wget > /dev/null 2>&1

echo -e "${GREEN}✅ Prerequisites installed${NC}"

#######################################################################
# Install Docker Engine
#######################################################################

echo ""
echo -e "${BLUE}🐳 Installing Docker Engine...${NC}"

# Check if Docker is already installed
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "${YELLOW}⚠️  Docker is already installed (version $DOCKER_VERSION)${NC}"
    read -p "Reinstall Docker? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Skipping Docker installation${NC}"
    else
        # Remove old Docker installations
        apt-get remove -y docker docker-engine docker.io containerd runc > /dev/null 2>&1 || true

        # Add Docker's official GPG key
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg

        # Set up Docker repository
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Install Docker Engine
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

        echo -e "${GREEN}✅ Docker Engine installed${NC}"
    fi
else
    # Remove old Docker installations
    apt-get remove -y docker docker-engine docker.io containerd runc > /dev/null 2>&1 || true

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    echo -e "${GREEN}✅ Docker Engine installed${NC}"
fi

# Start and enable Docker service
systemctl start docker
systemctl enable docker > /dev/null 2>&1

# Add user to docker group (allows running docker without sudo)
if groups $ACTUAL_USER | grep -q '\bdocker\b'; then
    echo -e "${BLUE}ℹ️  User $ACTUAL_USER is already in docker group${NC}"
else
    usermod -aG docker $ACTUAL_USER
    echo -e "${GREEN}✅ Added $ACTUAL_USER to docker group${NC}"
    echo -e "${YELLOW}⚠️  Note: You need to log out and back in for group changes to take effect${NC}"
fi

#######################################################################
# Install Node.js via NodeSource
#######################################################################

echo ""
echo -e "${BLUE}📦 Installing Node.js 20.x...${NC}"

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "${YELLOW}⚠️  Node.js ${NODE_VERSION} is already installed${NC}"
        read -p "Reinstall Node.js 20.x? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Skipping Node.js installation${NC}"
        else
            # Remove old Node.js
            apt-get remove -y nodejs npm > /dev/null 2>&1 || true

            # Install Node.js 20.x via NodeSource
            curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
            bash /tmp/nodesource_setup.sh
            rm /tmp/nodesource_setup.sh
            apt-get install -y -qq nodejs

            echo -e "${GREEN}✅ Node.js 20.x installed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Node.js ${NODE_VERSION} is installed but version 18+ is required${NC}"
        echo -e "${BLUE}Upgrading to Node.js 20.x...${NC}"

        # Remove old Node.js
        apt-get remove -y nodejs npm > /dev/null 2>&1 || true

        # Install Node.js 20.x via NodeSource
        curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
        bash /tmp/nodesource_setup.sh
        rm /tmp/nodesource_setup.sh
        apt-get install -y -qq nodejs

        echo -e "${GREEN}✅ Node.js 20.x installed${NC}"
    fi
else
    # Install Node.js 20.x via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
    bash /tmp/nodesource_setup.sh
    rm /tmp/nodesource_setup.sh
    apt-get install -y -qq nodejs

    echo -e "${GREEN}✅ Node.js 20.x installed${NC}"
fi

#######################################################################
# Install Git (if not present)
#######################################################################

echo ""
echo -e "${BLUE}📦 Checking Git installation...${NC}"

if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    echo -e "${GREEN}✅ Git ${GIT_VERSION} is already installed${NC}"
else
    apt-get install -y -qq git
    echo -e "${GREEN}✅ Git installed${NC}"
fi

#######################################################################
# Verify Installations
#######################################################################

echo ""
echo -e "${BLUE}🔍 Verifying installations...${NC}"
echo ""

DOCKER_VERSION=$(docker --version 2>&1 || echo "Not installed")
DOCKER_COMPOSE_VERSION=$(docker compose version 2>&1 || echo "Not installed")
NODE_VERSION=$(node --version 2>&1 || echo "Not installed")
NPM_VERSION=$(npm --version 2>&1 || echo "Not installed")
GIT_VERSION=$(git --version 2>&1 || echo "Not installed")

# Check if Docker is running
if systemctl is-active --quiet docker; then
    DOCKER_STATUS="${GREEN}Running${NC}"
else
    DOCKER_STATUS="${RED}Not running${NC}"
fi

#######################################################################
# Installation Summary
#######################################################################

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Installation Complete!                                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Installed Versions:${NC}"
echo -e "  🐳 Docker:          ${DOCKER_VERSION}"
echo -e "  🐳 Docker Compose:  ${DOCKER_COMPOSE_VERSION}"
echo -e "  📦 Node.js:         ${NODE_VERSION}"
echo -e "  📦 npm:             ${NPM_VERSION}"
echo -e "  📦 Git:             ${GIT_VERSION}"
echo ""
echo -e "${BLUE}🔄 Service Status:${NC}"
echo -e "  🐳 Docker service:  ${DOCKER_STATUS}"
echo ""

#######################################################################
# Test Docker Access for Actual User
#######################################################################

echo -e "${BLUE}🧪 Testing Docker access for user ${ACTUAL_USER}...${NC}"
echo ""

# Test if the user can run docker without sudo
if su - $ACTUAL_USER -c "docker ps > /dev/null 2>&1"; then
    echo -e "${GREEN}✅ Docker is working! User can run Docker commands without sudo.${NC}"
    DOCKER_WORKS=true
else
    echo -e "${RED}❌ Docker group changes not yet active in current session${NC}"
    DOCKER_WORKS=false
fi

echo ""

#######################################################################
# Post-Installation Instructions
#######################################################################

if [ "$DOCKER_WORKS" = true ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ Installation Complete - Docker is Ready!               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo ""
    echo -e "1. Verify Docker with a test container:"
    echo -e "   ${BLUE}docker run hello-world${NC}"
    echo ""
    echo -e "2. Continue with Neo4j Communication deployment:"
    echo -e "   ${BLUE}./scripts/check-system-requirements.sh${NC}  # Verify all requirements"
    echo -e "   ${BLUE}./scripts/deploy-ubuntu.sh${NC}              # Automated deployment"
else
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  Installation Complete - One More Step Required!      ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}🔒 Docker Permissions Not Yet Active${NC}"
    echo ""
    echo -e "The installer added you to the 'docker' group, but your current"
    echo -e "shell session doesn't recognize this change yet."
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}👉 QUICK FIX (Recommended):${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "   Run this command to activate Docker in your current session:"
    echo ""
    echo -e "   ${GREEN}${BOLD}newgrp docker${NC}"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Alternative:${NC} Log out and log back in (group changes will be permanent)"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📋 After activating Docker group:${NC}"
    echo ""
    echo -e "1. Verify Docker works:"
    echo -e "   ${BLUE}docker run hello-world${NC}"
    echo ""
    echo -e "2. Continue with Neo4j Communication deployment:"
    echo -e "   ${BLUE}./scripts/check-system-requirements.sh${NC}"
    echo -e "   ${BLUE}./scripts/deploy-ubuntu.sh${NC}"
fi

echo ""
