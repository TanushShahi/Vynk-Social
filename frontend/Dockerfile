# Multi-stage Dockerfile for Vynk Social Frontend
# Stage 1: Build
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy manifests
COPY frontend/package*.json ./frontend/
COPY shared ./shared

# Install dependencies
WORKDIR /app/frontend
RUN npm ci

# Copy source code and build
COPY frontend ./
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:1.27-alpine AS runner

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built SPA bundle from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy custom Nginx configuration with reverse proxy routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
