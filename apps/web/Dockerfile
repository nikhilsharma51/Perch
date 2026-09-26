# Perch Next.js Frontend - Production Docker Image
#
# Multi-stage build:
# 1. Builder stage: install deps, compile TypeScript, build Next.js output
# 2. Production stage: copy only runtime artifacts, keep image small

# ============ BUILDER STAGE ============
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# Copy workspace and package files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Install all dependencies (including dev deps for build)
RUN pnpm install --frozen-lockfile

# Build Next.js application
# This compiles TypeScript and generates .next/ output directory
RUN pnpm --filter web build


# ============ PRODUCTION STAGE ============
FROM node:20-alpine

WORKDIR /app

# Install pnpm (needed for runtime startup script)
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# Copy workspace config and package files for production
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built Next.js output from builder stage
COPY --from=builder /app/apps/web/.next ./apps/web/.next

# Expose Next.js default port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start Next.js in production mode
# Use pnpm to run the start script from apps/web/package.json
CMD ["pnpm", "--filter", "web", "start"]
