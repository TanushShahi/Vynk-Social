# Multi-stage Dockerfile for Vynk Social Backend
# Stage 1: Build
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native compilation dependencies for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY backend/package*.json ./backend/
COPY shared ./shared

# Install dependencies including devDependencies for TypeScript build
WORKDIR /app/backend
RUN npm ci

# Copy backend source and database schema
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY database /app/database
COPY database/schema.sql ./schema.sql

# Compile TypeScript to dist/
RUN npm run build

# Remove development dependencies for lean image
RUN npm prune --production

# Stage 2: Production Runner
FROM node:20-bookworm-slim AS runner

WORKDIR /app/backend

# Install curl for Docker health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Run as unprivileged node user
USER node

# Copy artifacts from builder
COPY --chown=node:node --from=builder /app/backend/package*.json ./
COPY --chown=node:node --from=builder /app/backend/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/backend/dist ./dist
COPY --chown=node:node --from=builder /app/database /app/database
COPY --chown=node:node --from=builder /app/backend/schema.sql ./schema.sql

# Create persistent storage directories with proper permissions
USER root
RUN mkdir -p /app/backend/data /app/backend/uploads && chown -R node:node /app/backend/data /app/backend/uploads
USER node

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/app/backend/data/vynk.db
ENV UPLOAD_DIR=/app/backend/uploads

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:5000/health || exit 1

CMD ["node", "dist/backend/src/server.js"]
