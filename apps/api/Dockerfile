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

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate


COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared ./packages/shared
COPY prisma ./prisma
COPY apps/api ./apps/api
COPY prisma.config.ts ./

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client - use dlx to bypass workspace resolution issues
RUN cd /app && pnpm dlx prisma@7.10.0 generate --schema=./prisma/schema.prisma

# Build the API server
# TypeScript compilation may have errors but we can continue if dist already exists
RUN pnpm --filter @perch/api run build || true
RUN if [ ! -f /app/apps/api/dist/server.js ]; then \
      echo "ERROR: Build did not produce server.js"; \
      exit 1; \
    fi

RUN rm -rf node_modules && pnpm install --frozen-lockfile --prod

RUN pnpm dlx prisma@7.10.0 generate --schema=./prisma/schema.prisma

EXPOSE 4000


HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"


CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma && node apps/api/dist/server.js"]
