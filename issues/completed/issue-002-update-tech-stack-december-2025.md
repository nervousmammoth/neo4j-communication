# Issue 002: Update Tech Stack to December 2025 Versions

## Problem Statement

Several dependencies in the project are behind current stable versions. Updating to latest versions ensures access to new features, performance improvements, security patches, and continued support.

## Version Updates Required

### Runtime & Infrastructure

| Component | Current | Target | Notes |
|-----------|---------|--------|-------|
| Node.js | 20 | 24 LTS | Newest LTS, supported until Apr 2028 |
| Neo4j Server | 5-community | 2025.x | Calendar versioning, requires Java 21 |
| neo4j-driver | 5.28.1 | 6.0.3 | Major version update |

### Core Dependencies

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| React | 19.0.0 | 19.2.0 | View Transitions, useEffectEvent |
| Vitest | 3.2.4 | 4.0.x | Browser Mode stable, breaking changes |
| @tanstack/react-query | 5.83.0 | 5.90.x | Minor update |
| @tanstack/react-query-devtools | 5.83.0 | 5.90.x | Minor update |
| @tanstack/react-table | 8.21.3 | Latest 8.x | Minor update |

### Already Up-to-Date (No Action Required)

- Next.js 16.0.6 (latest stable)
- Tailwind CSS 4 (latest stable)
- Radix UI components (recent versions)

## Breaking Changes to Address

### Neo4j 2025.x + Driver 6.x

- Requires Java 21 (Java 17 no longer supported)
- Block format is default for Enterprise Edition databases
- Cypher language decoupled from server (Cypher 5 or Cypher 25)
- Review query compatibility with Cypher 25
- Update docker-compose.yml for new Neo4j image tag

### Vitest 4.0

- coverage.all removed (now defaults to covered files only)
- Browser Mode API changes if using browser testing
- Review vitest.config.ts for deprecated options
- Check test coverage configuration still meets 98% threshold

### Node.js 24

- Update Dockerfile FROM node:20-alpine to node:24-alpine
- Verify all npm dependencies compatible with Node 24
- Update GitHub Actions workflow if specifying Node version

## Files to Modify

1. `frontend/package.json` - Update dependency versions
2. `frontend/Dockerfile` - Update Node.js base image
3. `data-scripts/docker-compose.yml` - Update Neo4j image tag
4. `frontend/vitest.config.ts` - Adjust for Vitest 4.0 changes (if needed)
5. `.github/workflows/*.yml` - Update Node version if specified

---

## Detailed Implementation Plan

### Phase 1: Infrastructure Updates

#### Step 1.1: Update Node.js in Dockerfile
**File:** `frontend/Dockerfile`

Change all three stages from `node:20-alpine` to `node:24-alpine`:

```dockerfile
# Line 4: FROM node:20-alpine AS deps → FROM node:24-alpine AS deps
# Line 20: FROM node:20-alpine AS builder → FROM node:24-alpine AS builder
# Line 41: FROM node:20-alpine AS runner → FROM node:24-alpine AS runner
```

#### Step 1.2: Update Neo4j Server in Docker Compose
**File:** `data-scripts/docker-compose.yml`

Change Neo4j image from v5 to 2025.x:

```yaml
# Line 8: image: neo4j:5-community → image: neo4j:2025-community
```

**Note:** Neo4j 2025.x uses Calendar Versioning. The image `neo4j:2025-community` will pull the latest 2025 release. Java 21 is included in the Docker image.

---

### Phase 2: Dependency Updates

#### Step 2.1: Update package.json dependencies
**File:** `frontend/package.json`

**Major version updates (require manual change):**

```json
"neo4j-driver": "^6.0.3",        // was "^5.28.1"
"vitest": "^4.0.0",              // was "^3.2.4"
"@vitest/ui": "^4.0.0",          // was "^3.2.4"
"@vitest/coverage-v8": "^4.0.0"  // was "^3.2.4"
```

**Minor version updates (via npm update):**

```json
"react": "^19.2.0",              // was "^19.0.0"
"react-dom": "^19.2.0",          // was "^19.0.0"
"@tanstack/react-query": "^5.90.0",
"@tanstack/react-query-devtools": "^5.90.0"
```

---

### Phase 3: Code Changes (if needed)

#### Step 3.1: Neo4j Driver 6.x Compatibility
**File:** `frontend/lib/neo4j/connection.ts`

**Assessment:** Current code is compatible with neo4j-driver 6.x:

- Import pattern unchanged: `import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver'`
- `disableLosslessIntegers: true` option still supported
- Session/driver API unchanged (`session.run()`, `session.close()`, `driver.close()`)
- **No code changes required** unless TypeScript compilation reveals type changes

#### Step 3.2: Vitest 4.0 Compatibility
**File:** `frontend/vitest.config.ts`

**Assessment:** Current config is compatible:

- No deprecated `workspace` option (renamed to `projects`)
- No deprecated `poolOptions` (moved to top-level)
- Coverage provider `v8` still supported
- **Potential issue:** `coverage.all` was removed in v4.0

**Verify coverage behavior:** In Vitest 4.0, only files loaded during tests are included in coverage by default. Our `exclude` patterns should still work, but verify threshold compliance after upgrade.

---

### Phase 4: Testing & Validation

#### Step 4.1: Local Testing Checklist

```bash
# 1. Install updated dependencies
cd frontend && npm install

# 2. Run type checking
npx tsc --noEmit

# 3. Run test suite with coverage
npm run test:coverage

# 4. Build application
npm run build

# 5. Start Neo4j locally and test connection
docker compose -f ../data-scripts/docker-compose.yml up -d neo4j
npm run dev  # Test manually
```

#### Step 4.2: Docker Testing Checklist

```bash
# 1. Build Docker image with new Node.js
docker build -t neo4j-communication:test .

# 2. Start full stack
cd ../data-scripts
docker compose down -v  # Clean slate
docker compose up -d

# 3. Verify health checks pass
docker compose ps
curl http://localhost:3000/api/health
```

---

## Testing Requirements

- [x] All existing tests pass (`npm run test:run`) - 1662 passing, 3 integration tests require running Neo4j
- [x] Test coverage maintains 98% threshold (`npm run test:coverage`)
- [x] TypeScript compilation succeeds (`npx tsc --noEmit`)
- [x] Neo4j queries execute correctly with driver 6.x
- [x] Application builds successfully (`npm run build`)
- [ ] Docker image builds with Node.js 24
- [ ] Docker compose starts without errors (Neo4j 2025.x + frontend)
- [ ] Health check endpoints respond correctly
- [ ] Manual smoke test: browse conversations, users, search

## Acceptance Criteria

- [x] `frontend/Dockerfile` uses `node:24-alpine`
- [x] `data-scripts/docker-compose.yml` uses `neo4j:2025-community`
- [x] `neo4j-driver` updated to ^6.0.1 (latest available)
- [x] `vitest` + related packages updated to ^4.0.15 (latest available)
- [x] `react` + `react-dom` updated to ^19.2.0
- [x] All tests pass with 98%+ coverage
- [ ] No regressions in functionality (pending manual testing)
- [x] CLAUDE.md updated with new version numbers

## Implementation Status

**PR:** https://github.com/nervousmammoth/neo4j-communication/pull/5

### Vitest 4.x Migration Notes
Several test files required updates for Vitest 4.0 compatibility:
- `vitest.setup.ts` - ResizeObserver mock now uses proper class syntax
- `conversations.test.ts` - Uses `vi.hoisted()` for mock functions
- `export-dropdown.test.tsx` - ResizeObserver class mock
- `users/route.test.ts` - Hoisted mocks for neo4j and crypto modules
- `conversations/route.test.ts` & `conversations.test.ts` - Crypto module mocks
- `communication-analytics.test.tsx` - Async timing fix for waitFor

## Risk Assessment

| Change | Risk Level | Mitigation |
|--------|------------|------------|
| Node.js 20 → 24 | Low | Well-tested LTS, Alpine images stable |
| Neo4j 5 → 2025.x | Medium | Test all queries, Cypher 5 syntax compatible |
| neo4j-driver 5 → 6 | Low | API backward compatible per documentation |
| Vitest 3 → 4 | Low | Config already uses non-deprecated options |
| React 19.0 → 19.2 | Low | Minor update, no breaking changes |

## References

- [Next.js 16 Blog](https://nextjs.org/blog/next-16)
- [React 19.2 Release](https://react.dev/blog/2025/10/01/react-19-2)
- [Neo4j 2025 Releases](https://community.neo4j.com/t/neo4j-2025-releases/72588)
- [Neo4j 5 to 2025.x Migration](https://neo4j.com/docs/upgrade-migration-guide/current/version-2025/)
- [Neo4j JavaScript Driver 6.x](https://github.com/neo4j/neo4j-javascript-driver/blob/6.x/README.md)
- [Node.js 24 LTS](https://nodejs.org/en/blog/release/v24.11.0)
- [Vitest 4.0 Migration Guide](https://vitest.dev/guide/migration.html)
