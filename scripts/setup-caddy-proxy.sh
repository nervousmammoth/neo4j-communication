#!/bin/bash

#######################################################################
# Neo4j Communication - Caddy Reverse Proxy Setup
#
# This script automatically installs and configures Caddy as a reverse
# proxy for the Neo4j Communication frontend application.
#
# Usage: ./setup-caddy-proxy.sh [OPTIONS]
#
# Environment Variables:
#   FRONTEND_PORT  - Frontend server port (default: 3000)
#   PUBLIC_PORT    - Public HTTP port (default: 80)
#   SKIP_FIREWALL  - Skip UFW firewall configuration (default: false)
#
# Options:
#   --dry-run      - Show what would be done without executing
#   --help         - Show this help message
#
# Exit codes:
#   0 - Caddy successfully configured
#   1 - Configuration failed
#######################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration (with defaults)
FRONTEND_PORT=${FRONTEND_PORT:-3000}
PUBLIC_PORT=${PUBLIC_PORT:-80}
SKIP_FIREWALL=${SKIP_FIREWALL:-false}
DRY_RUN=false

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CADDYFILE_PATH="/etc/caddy/Caddyfile"

#######################################################################
# Helper Functions
#######################################################################

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${CYAN}▶️  $1${NC}"
}

show_help() {
    echo "Neo4j Communication - Caddy Reverse Proxy Setup"
    echo ""
    echo "Usage: ./setup-caddy-proxy.sh [OPTIONS]"
    echo ""
    echo "Environment Variables:"
    echo "  FRONTEND_PORT   Frontend server port (default: 3000)"
    echo "  PUBLIC_PORT     Public HTTP port (default: 80)"
    echo "  SKIP_FIREWALL   Skip UFW configuration (default: false)"
    echo ""
    echo "Options:"
    echo "  --dry-run       Show what would be done without executing"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./setup-caddy-proxy.sh"
    echo "  FRONTEND_PORT=8080 ./setup-caddy-proxy.sh"
    echo "  ./setup-caddy-proxy.sh --dry-run"
    echo ""
}

execute_command() {
    local cmd="$1"
    local description="$2"

    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY-RUN]${NC} Would execute: $cmd"
        if [ -n "$description" ]; then
            echo -e "${CYAN}          ${NC} Purpose: $description"
        fi
    else
        eval "$cmd"
    fi
}

#######################################################################
# Parse Arguments
#######################################################################

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $arg"
            show_help
            exit 1
            ;;
    esac
done

#######################################################################
# Main Script
#######################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Neo4j Communication Caddy Reverse Proxy Setup                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warn "DRY-RUN MODE - No changes will be made"
    echo ""
fi

log_info "Configuration:"
echo -e "  ${CYAN}Frontend Port:${NC} $FRONTEND_PORT"
echo -e "  ${CYAN}Public Port:${NC} $PUBLIC_PORT"
echo -e "  ${CYAN}Skip Firewall:${NC} $SKIP_FIREWALL"
echo ""

#######################################################################
# Check if Caddy is Already Installed
#######################################################################

log_step "Checking if Caddy is already installed..."

if command -v caddy &> /dev/null; then
    CADDY_VERSION=$(caddy version | head -1)
    log_success "Caddy is already installed ($CADDY_VERSION)"
    CADDY_INSTALLED=true
else
    log_info "Caddy not found - will install"
    CADDY_INSTALLED=false
fi
echo ""

#######################################################################
# Install Caddy
#######################################################################

if [ "$CADDY_INSTALLED" = false ]; then
    log_step "Installing Caddy from official repository..."

    # Check if running as root or with sudo (skip in dry-run mode)
    if [ "$DRY_RUN" = false ]; then
        if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
            log_error "This script requires sudo privileges to install Caddy"
            echo -e "   ${YELLOW}Run with: sudo ./setup-caddy-proxy.sh${NC}"
            exit 1
        fi
    fi

    # Install required packages
    execute_command "sudo apt-get update -qq" "Update package lists"
    execute_command "sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl" "Install prerequisites"

    # Add Caddy repository
    execute_command "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg" "Add Caddy GPG key"
    execute_command "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list" "Add Caddy repository"

    # Install Caddy
    execute_command "sudo apt-get update -qq" "Refresh package lists"
    execute_command "sudo apt-get install -y caddy" "Install Caddy"

    if [ "$DRY_RUN" = false ]; then
        log_success "Caddy installed successfully"
    fi
    echo ""
fi

#######################################################################
# Create Caddyfile Configuration
#######################################################################

log_step "Creating Caddyfile configuration..."

CADDYFILE_CONTENT="# Neo4j Communication Reverse Proxy Configuration
# Auto-generated by setup-caddy-proxy.sh

# Listen on all interfaces (accepts traffic on any IP)
:${PUBLIC_PORT} {
    # Reverse proxy to frontend
    reverse_proxy localhost:${FRONTEND_PORT}

    # Preserve client information
    header_up X-Real-IP {remote_host}
    header_up X-Forwarded-For {remote_host}
    header_up X-Forwarded-Proto {scheme}

    # Enable logging
    log {
        output file /var/log/caddy/neo4j-communication-access.log
        format json
    }

    # Error handling
    handle_errors {
        respond \"{err.status_code} {err.status_text}\"
    }
}
"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY-RUN]${NC} Would create Caddyfile at: $CADDYFILE_PATH"
    echo -e "${CYAN}[DRY-RUN]${NC} Content:"
    echo "$CADDYFILE_CONTENT" | sed 's/^/          /'
else
    echo "$CADDYFILE_CONTENT" | sudo tee "$CADDYFILE_PATH" > /dev/null
    log_success "Caddyfile created at $CADDYFILE_PATH"
fi
echo ""

#######################################################################
# Test Caddy Configuration
#######################################################################

log_step "Testing Caddy configuration..."

if [ "$DRY_RUN" = false ]; then
    if sudo caddy validate --config "$CADDYFILE_PATH" &> /dev/null; then
        log_success "Caddy configuration is valid"
    else
        log_error "Caddy configuration validation failed"
        sudo caddy validate --config "$CADDYFILE_PATH"
        exit 1
    fi
else
    echo -e "${CYAN}[DRY-RUN]${NC} Would validate Caddyfile"
fi
echo ""

#######################################################################
# Configure systemd Service
#######################################################################

log_step "Configuring Caddy systemd service..."

execute_command "sudo systemctl daemon-reload" "Reload systemd"
execute_command "sudo systemctl enable caddy" "Enable Caddy service"

if [ "$DRY_RUN" = false ]; then
    log_success "Caddy service enabled"
fi
echo ""

#######################################################################
# Configure Firewall (UFW)
#######################################################################

if [ "$SKIP_FIREWALL" = false ]; then
    log_step "Configuring firewall (UFW)..."

    # Check if UFW is installed and active
    if command -v ufw &> /dev/null; then
        UFW_STATUS=$(sudo ufw status | head -1)

        if [[ "$UFW_STATUS" == *"active"* ]] || [[ "$UFW_STATUS" == *"inactive"* ]]; then
            # Allow public HTTP port
            execute_command "sudo ufw allow ${PUBLIC_PORT}/tcp comment 'Neo4j Communication Frontend (Caddy)'" "Allow port $PUBLIC_PORT"

            # Deny external access to frontend port (only allow localhost)
            execute_command "sudo ufw deny from any to any port ${FRONTEND_PORT} proto tcp comment 'Block direct frontend access'" "Block external access to port $FRONTEND_PORT"

            # Deny external access to Neo4j ports
            execute_command "sudo ufw deny from any to any port 7474 proto tcp comment 'Block Neo4j Browser'" "Block external access to Neo4j Browser"
            execute_command "sudo ufw deny from any to any port 7687 proto tcp comment 'Block Neo4j Bolt'" "Block external access to Neo4j Bolt"

            if [ "$DRY_RUN" = false ]; then
                log_success "Firewall configured"
                log_info "Port $PUBLIC_PORT: ✅ OPEN (public access)"
                log_info "Port $FRONTEND_PORT: 🔒 BLOCKED (localhost only)"
                log_info "Port 7474/7687: 🔒 BLOCKED (localhost only)"
            fi
        else
            log_warn "UFW is installed but not active - skipping firewall configuration"
            echo -e "   ${YELLOW}Enable UFW with: sudo ufw enable${NC}"
        fi
    else
        log_warn "UFW not installed - skipping firewall configuration"
        echo -e "   ${YELLOW}Install UFW with: sudo apt-get install ufw${NC}"
    fi
    echo ""
else
    log_info "Skipping firewall configuration (SKIP_FIREWALL=true)"
    echo ""
fi

#######################################################################
# Start Caddy Service
#######################################################################

log_step "Starting Caddy service..."

if [ "$DRY_RUN" = false ]; then
    if sudo systemctl is-active --quiet caddy; then
        execute_command "sudo systemctl restart caddy" "Restart Caddy"
    else
        execute_command "sudo systemctl start caddy" "Start Caddy"
    fi

    # Wait a moment for service to start
    sleep 2

    # Check if service started successfully
    if sudo systemctl is-active --quiet caddy; then
        log_success "Caddy service is running"
    else
        log_error "Failed to start Caddy service"
        echo -e "   ${YELLOW}Check logs with: sudo journalctl -u caddy -n 50${NC}"
        exit 1
    fi
else
    echo -e "${CYAN}[DRY-RUN]${NC} Would start/restart Caddy service"
fi
echo ""

#######################################################################
# Detect and Display Server IPs
#######################################################################

if [ "$DRY_RUN" = false ]; then
    log_step "Detecting server IP addresses..."
    echo ""

    # Get localhost
    echo -e "${GREEN}✅ Localhost Access:${NC}"
    echo -e "   ${CYAN}http://localhost${NC}"
    echo ""

    # Get local network IP(s)
    LOCAL_IPS=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^$' || true)
    if [ -n "$LOCAL_IPS" ]; then
        echo -e "${GREEN}✅ Local Network Access:${NC}"
        while IFS= read -r ip; do
            echo -e "   ${CYAN}http://${ip}${NC}"
        done <<< "$LOCAL_IPS"
        echo ""
    fi

    # Try to get public IP (with timeout)
    PUBLIC_IP=$(timeout 3 curl -s ifconfig.me 2>/dev/null || true)
    if [ -n "$PUBLIC_IP" ]; then
        echo -e "${GREEN}✅ Public Internet Access:${NC}"
        echo -e "   ${CYAN}http://${PUBLIC_IP}${NC}"
        echo ""
        log_warn "Make sure your firewall/router allows incoming traffic on port $PUBLIC_PORT"
        echo ""
    fi
fi

#######################################################################
# Summary
#######################################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  🔍 Dry-Run Complete - No Changes Made                     ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Run without --dry-run to apply these changes${NC}"
else
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ Caddy Reverse Proxy Configured Successfully!           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📋 Configuration Summary:${NC}"
    echo -e "   Public Port: ${CYAN}$PUBLIC_PORT${NC}"
    echo -e "   Frontend Port: ${CYAN}$FRONTEND_PORT${NC} (internal only)"
    echo -e "   Caddyfile: ${CYAN}$CADDYFILE_PATH${NC}"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo -e "   View status:  ${CYAN}sudo systemctl status caddy${NC}"
    echo -e "   View logs:    ${CYAN}sudo journalctl -u caddy -f${NC}"
    echo -e "   Restart:      ${CYAN}sudo systemctl restart caddy${NC}"
    echo -e "   Edit config:  ${CYAN}sudo nano $CADDYFILE_PATH${NC}"
    echo -e "   Validate:     ${CYAN}sudo caddy validate --config $CADDYFILE_PATH${NC}"
    echo ""
    echo -e "${GREEN}✨ Your application is now accessible through Caddy!${NC}"
fi

echo ""
exit 0
