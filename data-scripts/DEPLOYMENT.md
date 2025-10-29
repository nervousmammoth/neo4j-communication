# Deployment Guide

This guide explains how to deploy the Neo4j Communication Platform in different environments.

## Table of Contents

- [Production Deployment](#production-deployment)
- [Staging/Dev with Auto-Updates](#stagingdev-with-auto-updates)
- [Local Development](#local-development)
- [Updating Containers](#updating-containers)

---

## Production Deployment

**Recommended approach:** Manual deployment for maximum control and safety.

### Initial Setup

```bash
# 1. Clone or copy files to production server
cd /home/christoph/neo4j-communication

# 2. Create environment file
cd data-scripts
cp .env.docker.example .env
# Edit .env if needed

# 3. Start services (WITHOUT Watchtower)
docker compose up -d
```

### Updating Production

When a new version is pushed to Docker Hub:

```bash
# Option 1: Use the deployment script (Recommended)
cd /home/christoph/neo4j-communication
./scripts/deploy-production-docker.sh

# Option 2: Manual update
cd data-scripts
docker compose pull
docker compose up -d
```

**Access:**
- Frontend: http://localhost:3000
- Neo4j Browser: http://localhost:7474

---

## Staging/Dev with Auto-Updates

**Perfect for testing:** Automatically pulls and deploys new images when they're pushed to Docker Hub.

### Enable Watchtower

```bash
# Start with Watchtower enabled
cd data-scripts
docker compose --profile watchtower up -d
```

### How It Works

- **Checks Docker Hub** every 5 minutes for new images
- **Automatically pulls** and deploys updates
- **Zero downtime** with rolling restart
- **Cleans up** old images to save disk space

### Verify Watchtower is Running

```bash
docker compose --profile watchtower ps

# You should see:
# - neo4j-communication-db (Up)
# - neo4j-communication-frontend (Up)
# - watchtower (Up)
```

### Monitor Watchtower Activity

```bash
# Follow Watchtower logs
docker logs -f watchtower

# You'll see messages like:
# "Checking for updated images"
# "Found new image for neo4j-communication-frontend"
# "Stopping container neo4j-communication-frontend"
# "Starting container neo4j-communication-frontend"
```

### Disable Watchtower

```bash
# Stop Watchtower only
docker stop watchtower
docker rm watchtower

# Or restart without the watchtower profile
docker compose down
docker compose up -d
```

---

## Local Development

For local development with hot-reload:

```bash
# Build locally instead of pulling from Docker Hub
cd data-scripts

# Edit docker-compose.yml:
# Comment out: image: ${DOCKER_USERNAME:-nervousmammoth2}/neo4j-communication:${IMAGE_TAG:-latest}
# Uncomment: build section

# Start services
docker compose up -d

# View logs
docker compose logs -f
```

---

## Updating Containers

### Check for Updates

```bash
# See what images would be updated
docker compose pull --dry-run
```

### Update Specific Service

```bash
# Update only the frontend
docker compose pull neo4j-communication-frontend
docker compose up -d neo4j-communication-frontend
```

### Rollback to Previous Version

```bash
# Deploy a specific version
export IMAGE_TAG=v1.0.0
docker compose pull
docker compose up -d

# Or use the script
./scripts/deploy-production-docker.sh -t v1.0.0
```

---

## Configuration Options

### Environment Variables

Create a `.env` file in the `data-scripts` directory:

```bash
# Docker Hub Configuration
DOCKER_USERNAME=nervousmammoth2
IMAGE_TAG=latest

# Or specify a specific version
# IMAGE_TAG=v1.2.3
```

### Watchtower Configuration

Edit `docker-compose.yml` to customize Watchtower:

```yaml
environment:
  # Check every 10 minutes instead of 5
  - WATCHTOWER_POLL_INTERVAL=600

  # Enable Slack notifications
  - WATCHTOWER_NOTIFICATIONS=shoutrrr
  - WATCHTOWER_NOTIFICATION_URL=slack://token@channel

  # Enable debug logging
  - WATCHTOWER_DEBUG=true
```

---

## Troubleshooting

### Watchtower Not Updating

```bash
# Check Watchtower logs
docker logs watchtower

# Common issues:
# 1. Container doesn't have the label - Check docker-compose.yml line 71-72
# 2. No new image on Docker Hub - Verify GitHub Actions completed
# 3. Wrong image tag - Check .env file IMAGE_TAG variable
```

### Container Won't Start

```bash
# Check logs
docker logs neo4j-communication-frontend
docker logs neo4j-communication-db

# Check health status
docker inspect neo4j-communication-frontend --format='{{.State.Health.Status}}'

# Verify Neo4j is running
curl http://localhost:7474
```

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000
lsof -i :7474

# Stop conflicting service or change ports in docker-compose.yml
```

---

## Production Checklist

- [ ] Review security settings (passwords, firewall rules)
- [ ] Set up automated backups (`./scripts/backup-neo4j.sh`)
- [ ] Configure monitoring and alerts
- [ ] Test health endpoint: `curl http://localhost:3000/api/health`
- [ ] Document rollback procedure
- [ ] Set up SSL/HTTPS (use `./scripts/setup-caddy-proxy.sh`)
- [ ] Verify backup restoration process
- [ ] Set up log rotation for Docker containers

---

## Quick Reference

| Environment | Command | Auto-Update | Use Case |
|------------|---------|-------------|----------|
| **Production** | `docker compose up -d` | No | Live users |
| **Staging** | `docker compose --profile watchtower up -d` | Yes | Testing |
| **Development** | `docker compose up -d` | No | Local dev |

---

## Support

For issues or questions:
- Check logs: `docker compose logs -f`
- Health check: `curl http://localhost:3000/api/health`
- Container status: `docker compose ps`
