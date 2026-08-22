# ============================================================
# Stage 1: Build
# Build context is the REPO ROOT, so all paths start from there.
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only lockfiles first for better layer caching
COPY client/package.json client/package-lock.json ./

RUN npm ci

# Copy the rest of the client source
COPY client/ .

# VITE_ variables are baked into the static bundle at build time.
# Pass them as build args from docker-compose so they resolve correctly
# for the deployment environment (e.g. the nginx proxy URL, not localhost).
ARG VITE_API_URL=http://localhost:5000/api
ARG VITE_BASE_URL=http://localhost:5000
ARG VITE_FRONTEND_URL=http://localhost
ARG VITE_DISABLE_MFA=false

ENV VITE_API_URL=$VITE_API_URL \
    VITE_BASE_URL=$VITE_BASE_URL \
    VITE_FRONTEND_URL=$VITE_FRONTEND_URL \
    VITE_DISABLE_MFA=$VITE_DISABLE_MFA

RUN npm run build

# ============================================================
# Stage 2: Production — serve the static SPA via nginx
# ============================================================
FROM nginx:stable-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (path relative to repo root build context)
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check: nginx returns 200 on the root path
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
