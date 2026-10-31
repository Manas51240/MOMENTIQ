# CELEBRA — Production Deployment & Operations Guide
### Docker, PostgreSQL, High Availability & Production Hardening

---

## 1. Environment Configuration

Create a `.env.production` file on your host environment with the following production configuration:

```env
# Application Environment
NODE_ENV=production
PORT=3000

# Production Database (PostgreSQL 15+)
DATABASE_URL="postgresql://celebra_user:StrongPasswordSecure123!@postgres:5432/celebra_production?schema=public&sslmode=prefer"

# Cryptographic Session Key (Mandatory >= 32 characters in production)
SESSION_SECRET="e93b19409f626dbd5b8832a843e1cfcf0d9e29a39f60fa001eb70428d00928e4"

# Google Gemini API Key (Optional for live mode; fallback engine operates 100% offline)
GEMINI_API_KEY=""

# Third-Party Messaging Gateways (Optional; truth-in-delivery reports PROVIDER_UNCONFIGURED if blank)
RESEND_API_KEY=""
SENDGRID_API_KEY=""
TWILIO_AUTH_TOKEN=""
```

---

## 2. Docker & Multi-Stage Production Build

### Dockerfile
```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
```

### Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://celebra_user:StrongPasswordSecure123!@postgres:5432/celebra_production
      - SESSION_SECRET=e93b19409f626dbd5b8832a843e1cfcf0d9e29a39f60fa001eb70428d00928e4
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: celebra_user
      POSTGRES_PASSWORD: StrongPasswordSecure123!
      POSTGRES_DB: celebra_production
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./prisma/migrations/0_init_postgresql.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U celebra_user -d celebra_production"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## 3. Database Migration Procedures

### Applying PostgreSQL Schema Migrations
```bash
# Apply raw PostgreSQL DDL
psql -U celebra_user -d celebra_production -f prisma/migrations/0_init_postgresql.sql

# Or synchronize via Prisma ORM
npx prisma db push --schema=prisma/postgresql.schema.prisma
```

---

## 4. Production Health Monitoring

CELEBRA exposes a zero-auth health diagnostics probe at `/api/health`.

### Expected Output
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-10-31T04:14:00.000Z",
  "database": {
    "status": "connected",
    "latencyMs": 4
  },
  "security": {
    "sessionConfigured": true,
    "cryptoHealthy": true
  },
  "memory": {
    "heapUsedMb": 68,
    "heapTotalMb": 114
  }
}
```
