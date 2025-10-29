# CI/CD Workflow

This document describes the complete CI/CD workflow for the Neo4j Communication Platform.

## Overview

```
Code Change → GitHub Actions → Docker Hub → Deployment
```

## Complete Workflow

### 1. Development & Merge

```bash
# Make changes locally
git checkout -b feature/my-feature
# ... make changes ...
git commit -m "Add new feature"
git push origin feature/my-feature

# Create PR and merge to main
```

### 2. Automatic Build (GitHub Actions)

**Triggers:** Push to `main`, version tags (`v*.*.*`), manual dispatch

**What happens:**
- Checks out code from repository
- Builds Docker image from `frontend/Dockerfile`
- Tags image appropriately:
  - `main` push → `nervousmammoth2/neo4j-communication:latest`
  - `v1.2.3` tag → `1.2.3`, `1.2`, `1`, `latest`
- Pushes to Docker Hub

**Duration:** ~4 minutes

**Monitor:** https://github.com/nervousmammoth/neo4j-communication/actions

### 3. Deployment

#### Option A: Staging/Dev (Automatic with Watchtower)

```bash
# Start with Watchtower enabled
cd data-scripts
docker compose --profile watchtower up -d
```

**What happens:**
- Watchtower checks Docker Hub every 5 minutes
- Detects new image automatically
- Pulls and deploys with zero downtime
- Cleans up old images

**Total time from merge to deployment:** ~10 minutes

#### Option B: Production (Manual - Recommended)

```bash
# SSH to production server
cd /home/christoph/neo4j-communication

# Deploy latest version
./scripts/deploy-production-docker.sh

# Or deploy specific version
./scripts/deploy-production-docker.sh -t v1.0.0
```

## Quick Reference

### Start Containers

```bash
# Production (manual updates)
docker compose up -d

# Staging/Dev (automatic updates)
docker compose --profile watchtower up -d
```

### Check Status

```bash
# Container status
docker compose ps

# Application health
curl http://localhost:3000/api/health

# Watchtower logs
docker logs -f watchtower
```

### Deploy Updates

```bash
# Production: Manual
./scripts/deploy-production-docker.sh

# Staging: Automatic (Watchtower handles it)
# No action needed - just merge to main!
```

### Rollback

```bash
# Production: Deploy previous version
export IMAGE_TAG=v1.0.0
docker compose pull
docker compose up -d

# Or use script
./scripts/deploy-production-docker.sh -t v1.0.0
```

## Versioning Strategy

### Using Tags

```bash
# Create a release version
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

**GitHub Actions will create:**
- `nervousmammoth2/neo4j-communication:1.0.0`
- `nervousmammoth2/neo4j-communication:1.0`
- `nervousmammoth2/neo4j-communication:1`
- `nervousmammoth2/neo4j-communication:latest`

### Using Latest

```bash
# Just merge to main
git push origin main
```

**GitHub Actions will update:**
- `nervousmammoth2/neo4j-communication:latest`
- `nervousmammoth2/neo4j-communication:main`

## Environment Comparison

| Environment | Deployment | Speed | Use Case |
|------------|------------|-------|----------|
| **Production** | Manual | On demand | Live users, controlled releases |
| **Staging** | Automatic (Watchtower) | ~10 min | Testing, validation |
| **Local Dev** | Manual | Instant | Development, debugging |

## Workflow Diagram

```
┌─────────────────────────────────────────┐
│ Developer                               │
│ - Makes code changes                    │
│ - Commits to branch                     │
│ - Creates PR                            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Pull Request Review                     │
│ - Code review                           │
│ - Tests pass                            │
│ - Merge to main                         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ GitHub Actions (Automatic)              │
│ - Checkout code                         │
│ - Build Docker image                    │
│ - Push to Docker Hub                    │
│ - Duration: ~4 minutes                  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Docker Hub                              │
│ Image: nervousmammoth2/neo4j-           │
│        communication:latest             │
└─────────┬───────────────┬───────────────┘
          │               │
          │               ▼
          │    ┌────────────────────────────┐
          │    │ Staging/Dev (Watchtower)   │
          │    │ - Auto-detects update      │
          │    │ - Pulls & deploys          │
          │    │ - Zero downtime            │
          │    │ - Time: ~5 minutes         │
          │    └────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│ Production (Manual)                     │
│ - Admin runs deploy script              │
│ - Controlled timing                     │
│ - Verified in staging first             │
└─────────────────────────────────────────┘
```

## Monitoring

### GitHub Actions

- **URL:** https://github.com/nervousmammoth/neo4j-communication/actions
- **Check:** Build status, logs, duration
- **Notifications:** GitHub will notify on failures

### Docker Hub

- **URL:** https://hub.docker.com/r/nervousmammoth2/neo4j-communication
- **Check:** Available tags, image size, last push time

### Watchtower Logs

```bash
# Real-time monitoring
docker logs -f watchtower

# Recent activity
docker logs watchtower --tail 50
```

### Application Health

```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","service":"neo4j-communication-frontend"}
```

## Troubleshooting

### Build Failed on GitHub Actions

```bash
# Check build logs
# Visit: https://github.com/nervousmammoth/neo4j-communication/actions

# Common fixes:
# - Ensure Dockerfile is valid
# - Check Docker Hub secrets are set
# - Verify no syntax errors in code
```

### Watchtower Not Updating

```bash
# Check Watchtower logs
docker logs watchtower

# Verify label is set
docker inspect neo4j-communication-frontend | grep watchtower

# Manually trigger update
docker compose pull
docker compose up -d
```

### Container Won't Start

```bash
# Check container logs
docker logs neo4j-communication-frontend

# Verify Neo4j is running
docker logs neo4j-communication-db

# Check health status
docker compose ps
```

## Best Practices

1. **Always test in staging** before deploying to production
2. **Use version tags** for production releases
3. **Monitor GitHub Actions** for build failures
4. **Keep `latest` tag** for staging/development
5. **Document breaking changes** in commit messages
6. **Backup Neo4j data** before major updates
7. **Test rollback procedure** periodically

## Additional Resources

- **Detailed Deployment Guide:** `data-scripts/DEPLOYMENT.md`
- **GitHub Actions Workflow:** `.github/workflows/docker-build-push.yml`
- **Docker Compose Config:** `data-scripts/docker-compose.yml`
- **Deployment Scripts:** `scripts/deploy-production-docker.sh`

---

**Last Updated:** 2025-10-29
