# BFF Gateway - Property Tokenization Platform

Backend for Frontend (BFF) service that acts as an aggregation and proxy layer between the React frontend and backend services (Orchestrator + Offchain API).

## Purpose

The BFF Gateway:
- **Decouples** the frontend from backend services
- **Aggregates** data from multiple services (Orchestrator + Offchain API)
- **Formats** responses for frontend consumption
- **Validates** JWT tokens (stateless)
- **Reduces** latency by batching requests

**IMPORTANT:** The BFF has **NO DATABASE** and **NO BUSINESS LOGIC**. It is a stateless proxy/aggregator.

## Architecture

```
Frontend (React)
    ↓ HTTP + JWT
BFF Gateway (THIS SERVICE) - Port 4000
    ↓                    ↓
    ↓                    ↓
Orchestrator         Offchain API
(Spring Boot)        (Node.js + Ethers.js)
Port 8080            Port 3000
```

## Responsibilities

### ✅ What BFF DOES:
- Proxy authentication requests to Orchestrator
- Validate JWT signatures (stateless)
- Aggregate data from Orchestrator + Offchain API
- Format responses for frontend
- Handle CORS and security headers

### ❌ What BFF DOES NOT DO:
- Store data (no database)
- Implement business logic
- Generate JWTs (Orchestrator does this)
- Validate user credentials (Orchestrator does this)
- Interact with blockchain directly (Offchain API does this)

## Prerequisites

- Node.js 18+
- npm or yarn
- Running Orchestrator service (port 8080)
- Running Offchain API service (port 3000)

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd bff-gateway

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# Run in development mode
npm run dev
```

The BFF Gateway will be available at `http://localhost:4000`

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Service URLs
ORCHESTRATOR_URL=http://localhost:8080
OFFCHAIN_API_URL=http://localhost:3000

# JWT Configuration (MUST match Orchestrator's secret)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080

# Logging
LOG_LEVEL=info
```

**CRITICAL:** The `JWT_SECRET` must be identical to the secret used by the Orchestrator service to generate JWTs

## Development

```bash
# Development mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Production mode
npm start

# Run tests
npm test
```

## API Endpoints

### Authentication (Proxy to Orchestrator)

**POST /auth/login**
- Proxies to: `Orchestrator /api/users/login`
- Body: `{ email, password }`
- Returns: `{ token, user }`

**POST /auth/register**
- Proxies to: `Orchestrator /api/users/register`
- Body: `{ name, email, cpf, password, walletAddress }`
- Returns: `{ message, userId }`

### Properties (Aggregation)

**GET /properties/my**
- Requires: JWT authentication
- Aggregates: Orchestrator (DB metadata) + Offchain API (blockchain state)
- Returns: Array of properties with both DB and blockchain data

**GET /properties/:id/full**
- Aggregates: Orchestrator (metadata) + Offchain API (blockchain state)
- Returns: Complete property details

**POST /properties/register**
- Requires: JWT authentication
- Forwards to: Orchestrator
- Returns: `{ status: "pending", jobId }`

### Transfers (Aggregation)

**GET /transfers/:id/status**
- Aggregates: Orchestrator (DB status) + Offchain API (blockchain approvals)
- Returns: Complete transfer status with approvals

### Health

**GET /health**
- Returns: Health status of BFF + connected services

## How JWT Works

1. **Frontend** sends credentials to BFF `/auth/login`
2. **BFF** proxies request to **Orchestrator**
3. **Orchestrator** validates credentials in PostgreSQL
4. **Orchestrator** generates JWT with user info
5. **Orchestrator** returns JWT to BFF
6. **BFF** forwards JWT to Frontend
7. **Frontend** stores JWT and sends in `Authorization: Bearer <token>` header
8. **BFF** validates JWT signature (stateless, no DB lookup)
9. **BFF** extracts user info from JWT and forwards to backend services

## Data Aggregation Example

```typescript
// GET /properties/my

// 1. BFF calls Orchestrator
const dbProperties = await orchestrator.getUserProperties(userId);
// Returns: [{ matriculaId, ownerCpf, address, area }]

// 2. BFF calls Offchain API
const blockchainProperties = await offchain.getPropertiesByOwner(walletAddress);
// Returns: [{ matriculaId, ownerWallet, txHash, isFrozen }]

// 3. BFF merges data
const aggregated = dbProperties.map(dbProp => ({
  ...dbProp,
  blockchain: blockchainProperties.find(bp => bp.matriculaId === dbProp.matriculaId)
}));

// 4. BFF returns to frontend
return aggregated;
```

## Error Handling

All errors are formatted as:

```json
{
  "message": "Error description",
  "statusCode": 400,
  "errors": []
}
```

## Security

- **Helmet**: Security headers
- **CORS**: Configurable allowed origins
- **JWT Validation**: Stateless signature verification
- **No sensitive data storage**: BFF has no database

## Monitoring

Logs are written to stdout using Morgan:
- Development: `dev` format (colored, minimal)
- Production: `combined` format (Apache-style)

## Testing

```bash
# Unit tests
npm test

# Integration tests (requires services running)
npm run test:integration
```

## Docker

```bash
# Build image
docker build -t bff-gateway .

# Run container
docker run -p 4000:4000 \
  -e ORCHESTRATOR_URL=http://orchestrator:8080 \
  -e OFFCHAIN_API_URL=http://offchain:3000 \
  bff-gateway
```

## Health Check

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "orchestrator": "connected",
    "offchainApi": "connected"
  }
}
```

## Troubleshooting

### Orchestrator Service Unavailable

**Problem**: `Orchestrator service is unavailable`

**Solution**:
- Ensure Orchestrator is running: `curl http://localhost:8080/api/health`
- Check `ORCHESTRATOR_URL` in `.env` matches orchestrator location
- Verify network connectivity between services
- Check orchestrator logs for errors

### Invalid Token

**Problem**: `Invalid token` or `JWT verification failed`

**Solution**:
- Ensure `JWT_SECRET` in `.env` exactly matches Orchestrator's secret
- Check token hasn't expired (default 24h)
- Verify token format: `Authorization: Bearer <token>`
- Generate new token by logging in again

### CORS Error

**Problem**: Browser shows CORS policy error

**Solution**:
- Add frontend URL to `ALLOWED_ORIGINS` in `.env`
- Example: `ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000`
- Restart BFF Gateway after changing `.env`
- Clear browser cache

### Offchain API Unreachable

**Problem**: Cannot connect to Offchain API

**Solution**:
- Verify Offchain API is running: `curl http://localhost:3000/health`
- Check `OFFCHAIN_API_URL` in `.env`
- Ensure blockchain network (Besu) is running

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Find process using port 4000
lsof -i :4000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=4001
```

## Architecture Notes

This service follows the **Backend for Frontend (BFF)** pattern:
- Tailored specifically for the React frontend
- No business logic (that's in Orchestrator)
- No data persistence (that's in Orchestrator)
- Stateless design (can be horizontally scaled)

For production deployment, consider:
- Load balancing (Nginx, HAProxy)
- Kubernetes deployment with multiple replicas
- Redis for response caching (optional)
- Rate limiting per user/IP

## License

MIT
