# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neo4j Communication Analytics Platform - A Next.js application for analyzing communication patterns using Neo4j graph database. The platform visualizes conversations, messages, and user interactions with advanced analytics and search capabilities.

## Development Philosophy

### Spec-Driven Development - MANDATORY

**All new features must follow the specification workflow. NO EXCEPTIONS.**

#### Workflow
1. **Create specification** in `/issues/` directory with detailed requirements
2. **Review and approve** the spec before any implementation
3. **NEVER WORK IN MAIN** - Create feature branch from main (MANDATORY)
4. **Create feature branch** with descriptive name (e.g., `feature/001-redesign-communication-interface`)
5. **Follow TDD**: Write tests first, make them fail, then implement
6. **Create pull request** when implementation is complete
7. **Merge PR** after code review and all tests pass
8. **Move specification** from `/issues/` to `/issues/completed/` after successful merge

#### Issue Specification Format
- Issue files must be placed in `/issues/` directory
- Use descriptive filenames (e.g., `issue-001-add-user-filtering.md`)
- Include: problem statement, requirements, acceptance criteria, technical approach
- Get approval before starting implementation

### Test-Driven Development (TDD) - MANDATORY

**This project follows STRICT Test-Driven Development. NO EXCEPTIONS.**

#### TDD Workflow (Red-Green-Refactor)
1. **Write the test FIRST** - Before writing any implementation code
2. **Run the test and watch it FAIL** - Verify the test catches the missing functionality
3. **Write minimal code to make it pass** - Implement just enough to pass the test
4. **Refactor** - Clean up code while keeping tests green
5. **Repeat** - For every new feature, bug fix, or change

#### Absolute Rules
- **NEVER WORK DIRECTLY IN MAIN BRANCH** - Always create a feature branch first
- **NEVER write implementation code without a failing test first**
- **100% test coverage is the minimum standard** - Current thresholds (98%) are temporary and should be pushed to 100%
- **Tests must be meaningful and high-quality**:
  - Test behavior, not implementation details
  - Cover edge cases and error scenarios
  - Test user-facing outcomes
  - Avoid trivial tests that don't add value
- **If you're fixing a bug**: Write a test that reproduces the bug FIRST, then fix it
- **If you're adding a feature**: Write tests that define the feature FIRST, then implement it

#### Quality Over Quantity
- Don't write tests just to increase coverage numbers
- Each test should verify meaningful behavior
- Tests should be clear, maintainable, and document intent
- Use descriptive test names that explain the scenario and expected outcome

## Architecture

### Tech Stack
- **Runtime**: Node.js 24 LTS
- **Frontend**: Next.js 16.0.6 (App Router), React 19.2, TypeScript
- **Database**: Neo4j 2025 Community Edition (graph database)
- **UI**: Tailwind CSS 4, Radix UI, Recharts
- **Testing**: Vitest 4.x with 98% coverage thresholds
- **Deployment**: Docker with GitHub Actions CI/CD

### Project Structure

```text
neo4j-communication/
├── frontend/                    # Next.js application
│   ├── app/                    # Next.js App Router
│   │   ├── (main)/            # Main layout group
│   │   │   ├── conversations/ # Conversation views
│   │   │   └── users/         # User profiles & communication analysis
│   │   └── api/               # API routes (Next.js backend)
│   ├── components/            # React components
│   ├── lib/                   # Core libraries
│   │   ├── neo4j/            # Neo4j integration layer
│   │   │   ├── connection.ts # Driver management
│   │   │   ├── queries/      # Cypher queries organized by domain
│   │   │   ├── types.ts      # TypeScript interfaces
│   │   │   └── utils.ts      # Helper functions
│   │   ├── api-client.ts     # Frontend API client
│   │   └── utils.ts          # General utilities
│   ├── hooks/                # Custom React hooks
│   └── __tests__/            # Test files (mirrors src structure)
├── data-scripts/             # Database seeding & utilities
└── scripts/                  # Deployment & maintenance scripts
```

### Data Layer Architecture

**Neo4j Connection Pattern**:
- Singleton driver instance in `lib/neo4j/connection.ts`
- Sessions created per query and closed immediately
- Connection config via environment variables: `NEO4J_01_URI`, `NEO4J_01_USER`, `NEO4J_01_PASSWORD`

**Query Organization** (`lib/neo4j/queries/`):
- `users.ts` - User listing, search, contacts
- `conversations.ts` - Conversation retrieval, search, messages
- `analytics.ts` - Communication analytics and aggregations

**API Layer**:
- Next.js API routes in `app/api/` consume Neo4j queries
- Frontend uses `lib/api-client.ts` for all API calls
- Never import Neo4j queries directly in components - always go through API routes

### Key Data Models

From `lib/neo4j/types.ts`:
- **User**: Profile data, status, department, location
- **Conversation**: Direct/group chats with participants and messages
- **Message**: Content, timestamp, sender, status, reactions
- **UserCommunicationData**: Shared conversations, stats, timeline between two users
- **AggregatedCommunicationData**: Analytics (frequency, response times, heatmaps)

### Environment Variables

Required for Neo4j connection:
```bash
NEO4J_01_URI=bolt://localhost:7687
NEO4J_01_USER=neo4j
NEO4J_01_PASSWORD=<password>
```

## Common Development Commands

### Frontend Development

```bash
cd frontend

# Development server with Turbopack
npm run dev

# Build production bundle
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Testing

```bash
cd frontend

# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run a single test file
npm test -- __tests__/lib/api-client.test.ts

# Run tests matching a pattern
npm test -- -t "should fetch users"

# Run with UI
npm run test:ui

# Coverage report (thresholds: 98% lines/functions/statements, 95% branches)
npm run test:coverage

# Kill hanging test processes
npm run test:cleanup
```

### Database Operations

```bash
cd data-scripts

# Seed development data (150 users, 1,500 conversations, ~157,500 messages)
NEO4J_01_URI=bolt://localhost:7687 NEO4J_01_USER=neo4j NEO4J_01_PASSWORD=<password> node seed-data.js

# Update avatar URLs
node update-avatars-to-professional.js

# Create indexes for performance
cd ../frontend
node scripts/create-indexes.ts

# Test communication query performance
node scripts/test-communication-performance.ts
```

### Docker & Deployment

```bash
cd data-scripts

# Start services (production mode - manual updates)
docker compose up -d

# Start with Watchtower (staging/dev - auto-updates every 5 minutes)
docker compose --profile watchtower up -d

# Check status
docker compose ps

# View logs
docker compose logs -f neo4j-communication-frontend
docker compose logs -f neo4j-communication-db

# Update containers manually
docker compose pull
docker compose up -d

# Stop services
docker compose down
```

### Deployment Scripts

```bash
# Deploy production with latest image
./scripts/deploy-production-docker.sh

# Deploy specific version
./scripts/deploy-production-docker.sh -t v1.0.0

# Backup Neo4j data
./scripts/backup-neo4j.sh

# Setup Caddy reverse proxy with SSL
./scripts/setup-caddy-proxy.sh
```

## Neo4j Query Patterns

### Pagination
All paginated queries follow this pattern:
1. Get total count first
2. Apply SKIP/LIMIT for pagination
3. Return data with pagination metadata

Example:
```cypher
MATCH (u:User)
WITH count(u) as total
MATCH (u:User)
RETURN u
SKIP $skip
LIMIT $limit
```

### Performance Considerations
- Always use indexes on frequently queried properties (userId, timestamp, conversationId)
- Use `OPTIONAL MATCH` for relationships that might not exist
- Apply filters before aggregations
- Paginate BEFORE calculating counts when possible

### Connection Management
- Use `executeReadQuery()` from `lib/neo4j/connection.ts` for all queries
- Sessions are automatically created and closed
- Driver is a singleton instance shared across requests

## Testing Guidelines

### Test Organization
- Tests mirror source structure in `__tests__/` directory
- Vitest with jsdom environment for React components
- Coverage thresholds enforced: 98% lines/functions/statements, 95% branches

### Coverage Exclusions
- UI components from shadcn/ui (`**/ui/**`)
- Next.js framework files (`error.tsx`, `loading.tsx`)
- Config files (`*.config.*`)
- Utility scripts (`scripts/**`)

### Mock Neo4j in Tests
```typescript
vi.mock('@/lib/neo4j/connection', () => ({
  executeReadQuery: vi.fn()
}))
```

## Component Patterns

### Data Fetching
- Server Components fetch data directly via API client
- Client Components use TanStack Query (React Query) via hooks
- Pagination and search state managed in URL params

### UI Components
- Use shadcn/ui components from `components/ui/`
- Tailwind CSS for styling with `cn()` utility from `lib/utils.ts`
- Lucide React for icons

### State Management
- TanStack Query for server state
- React Context for global UI state (sidebar, theme)
- URL params for shareable state (pagination, filters)

## CI/CD Workflow

### GitHub Actions
- Triggered on: push to `main`, version tags (`v*.*.*`), manual dispatch
- Builds Docker image from `frontend/Dockerfile`
- Pushes to Docker Hub: `nervousmammoth2/neo4j-communication:latest`
- Monitor: https://github.com/nervousmammoth/neo4j-communication/actions

### Deployment Environments
- **Production**: Manual deployment via `deploy-production-docker.sh`
- **Staging**: Auto-deployment with Watchtower (checks every 5 minutes)
- **Development**: Local docker compose or npm dev server

### Versioning
```bash
# Create release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
# Creates tags: 1.0.0, 1.0, 1, latest
```

## Important Constraints

### API Route Pattern
- Next.js API routes handle all database access
- Routes validate params using `lib/validated-params.ts`
- Return JSON with proper error handling (400, 404, 500)
- Use Next.js caching with `{ next: { revalidate: N } }`

### User ID Normalization
Communication data between users is normalized alphabetically for consistent caching:
```typescript
const [userId1, userId2] = [userA, userB].sort()
```

### Date Formatting
- Database stores ISO strings
- Display uses `date-fns` via `lib/date-formatting.ts`
- Timestamps use `lib/timestamp.ts` for relative display

## Common Issues & Solutions

### Neo4j Connection
- Default creds in docker-compose.yml: `neo4j/<password>` (see docker-compose.yml)
- Connection test: `curl http://localhost:3000/api/health`
- Neo4j browser: http://localhost:7474

### Port Conflicts
- Frontend: 3000
- Neo4j HTTP: 7474
- Neo4j Bolt: 7687

### Test Hanging
Run `npm run test:cleanup` to kill orphaned processes

### Docker Updates Not Applying
Check Watchtower logs: `docker logs watchtower`
Verify label in docker-compose.yml (line 71-72)

## Key Files Reference

- `WORKFLOW.md` - Complete CI/CD workflow documentation
- `data-scripts/DEPLOYMENT.md` - Detailed deployment guide
- `frontend/vitest.config.ts` - Test configuration
- `frontend/lib/neo4j/index.ts` - Neo4j module exports (barrel file)
- `data-scripts/docker-compose.yml` - Container orchestration
