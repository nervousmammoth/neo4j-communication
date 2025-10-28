#!/bin/bash

#######################################################################
# Neo4j Communication - Neo4j Database Backup Script
#
# This script creates timestamped backups of the Neo4j database
# by backing up the Docker volume data.
#
# Usage: ./backup-neo4j.sh [backup-directory]
#
# If no backup directory is specified, backups are saved to
# ../backups relative to the script location.
#
# Configuration:
#   KEEP_BACKUPS - Number of backups to keep (default: 7)
#######################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
KEEP_BACKUPS=${KEEP_BACKUPS:-7}  # Keep last 7 backups by default
BACKUP_DIR=${1:-"$PROJECT_ROOT/backups"}
CONTAINER_NAME="neo4j-communication-neo4j"
VOLUME_NAME="data-scripts_neo4j_data"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILENAME="neo4j-backup-${TIMESTAMP}.tar.gz"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Neo4j Communication - Neo4j Database Backup              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

#######################################################################
# Create Backup Directory
#######################################################################

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${BLUE}📁 Creating backup directory: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
fi

#######################################################################
# Check if Docker is Running
#######################################################################

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo -e "   Start Docker with: sudo systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

#######################################################################
# Check if Neo4j Container Exists
#######################################################################

if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Neo4j container '${CONTAINER_NAME}' not found${NC}"
    echo -e "   Run setup-neo4j.sh to create the container first"
    exit 1
fi

echo -e "${GREEN}✅ Neo4j container found${NC}"

#######################################################################
# Check if Container is Running
#######################################################################

IS_RUNNING=false
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    IS_RUNNING=true
    echo -e "${BLUE}ℹ️  Neo4j is currently running${NC}"
else
    echo -e "${BLUE}ℹ️  Neo4j is not currently running${NC}"
fi

#######################################################################
# Stop Neo4j if Running
#######################################################################

if [ "$IS_RUNNING" = true ]; then
    echo -e "${BLUE}⏹️  Stopping Neo4j for backup...${NC}"
    cd "$PROJECT_ROOT/data-scripts"

    if [ -f "./teardown-neo4j.sh" ]; then
        ./teardown-neo4j.sh > /dev/null 2>&1
        echo -e "${GREEN}✅ Neo4j stopped${NC}"
    else
        # Fallback to direct docker stop
        docker stop "$CONTAINER_NAME" > /dev/null 2>&1
        echo -e "${GREEN}✅ Neo4j stopped (direct)${NC}"
    fi

    # Wait a moment for container to fully stop
    sleep 2
fi

#######################################################################
# Create Backup
#######################################################################

echo ""
echo -e "${BLUE}💾 Creating backup...${NC}"
echo -e "   Volume: $VOLUME_NAME"
echo -e "   Destination: $BACKUP_DIR/$BACKUP_FILENAME"

if docker volume inspect "$VOLUME_NAME" > /dev/null 2>&1; then
    docker run --rm \
        -v "$VOLUME_NAME:/data:ro" \
        -v "$BACKUP_DIR:/backup" \
        ubuntu tar czf "/backup/$BACKUP_FILENAME" /data

    if [ -f "$BACKUP_DIR/$BACKUP_FILENAME" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILENAME" | cut -f1)
        echo -e "${GREEN}✅ Backup created successfully${NC}"
        echo -e "   Size: $BACKUP_SIZE"
        echo -e "   File: $BACKUP_FILENAME"
    else
        echo -e "${RED}❌ Backup file was not created${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Volume '$VOLUME_NAME' not found${NC}"
    exit 1
fi

#######################################################################
# Restart Neo4j if it was Running
#######################################################################

if [ "$IS_RUNNING" = true ]; then
    echo ""
    echo -e "${BLUE}🔄 Restarting Neo4j...${NC}"
    cd "$PROJECT_ROOT/data-scripts"

    if [ -f "./setup-neo4j.sh" ]; then
        ./setup-neo4j.sh > /dev/null 2>&1
        echo -e "${GREEN}✅ Neo4j restarted${NC}"
    else
        # Fallback to direct docker start
        docker start "$CONTAINER_NAME" > /dev/null 2>&1
        echo -e "${GREEN}✅ Neo4j restarted (direct)${NC}"
    fi
fi

#######################################################################
# Clean Up Old Backups
#######################################################################

echo ""
echo -e "${BLUE}🧹 Cleaning up old backups (keeping last $KEEP_BACKUPS)...${NC}"

# Count existing backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "neo4j-backup-*.tar.gz" -type f | wc -l)

if [ "$BACKUP_COUNT" -gt "$KEEP_BACKUPS" ]; then
    # Delete oldest backups
    BACKUPS_TO_DELETE=$((BACKUP_COUNT - KEEP_BACKUPS))
    find "$BACKUP_DIR" -name "neo4j-backup-*.tar.gz" -type f -printf '%T+ %p\n' | \
        sort | \
        head -n "$BACKUPS_TO_DELETE" | \
        cut -d' ' -f2- | \
        while read -r old_backup; do
            rm "$old_backup"
            echo -e "   ${YELLOW}Deleted: $(basename "$old_backup")${NC}"
        done
    echo -e "${GREEN}✅ Cleaned up $BACKUPS_TO_DELETE old backup(s)${NC}"
else
    echo -e "${GREEN}✅ No cleanup needed (${BACKUP_COUNT}/${KEEP_BACKUPS} backups)${NC}"
fi

#######################################################################
# Summary
#######################################################################

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Backup Complete!                                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Backup Information:${NC}"
echo -e "  Backup file:   $BACKUP_FILENAME"
echo -e "  Location:      $BACKUP_DIR"
echo -e "  Backups kept:  $BACKUP_COUNT (max: $KEEP_BACKUPS)"
echo ""
echo -e "${BLUE}💡 To restore this backup:${NC}"
echo -e "  1. Stop Neo4j: ${GREEN}cd $PROJECT_ROOT/data-scripts && ./teardown-neo4j.sh${NC}"
echo -e "  2. Restore: ${GREEN}docker run --rm -v $VOLUME_NAME:/data -v $BACKUP_DIR:/backup ubuntu tar xzf /backup/$BACKUP_FILENAME -C /${NC}"
echo -e "  3. Start Neo4j: ${GREEN}cd $PROJECT_ROOT/data-scripts && ./setup-neo4j.sh${NC}"
echo ""

exit 0
