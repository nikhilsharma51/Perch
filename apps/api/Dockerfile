# Perch API Server - Production Docker Image
# 
# This is a standalone build for the Express API server.
# It expects:
# - DATABASE_URL: connection string to Neon (remote Postgres)
# - REDIS_URL: connection string to Redis (passed from docker-compose or env)
# - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: Stripe API keys
# - JWT_SECRET: secret key for JWT signing

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# Copy workspace and package files first
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared ./packages/shared
COPY prisma ./prisma
COPY apps/api ./apps/api

# Install dependencies with frozen lockfile (no changes)
RUN pnpm install --frozen-lockfile --prod

# Build the API server
# This compiles TypeScript in apps/api/src to apps/api/dist
RUN pnpm --filter @perch/api build

# Expose the API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the server
# Entry point is apps/api/dist/server.js (compiled from src/server.ts)
CMD ["node", "apps/api/dist/server.js"]
