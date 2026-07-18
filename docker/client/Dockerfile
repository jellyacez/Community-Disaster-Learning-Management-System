# ============================================================
# Stage 1: Build
# Build context is the REPO ROOT, so all paths start from there.
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only package files first for better layer caching
COPY client/package.json client/package-lock.json ./

RUN npm ci

# Copy the rest of the client source and build
COPY client/ .

RUN npm run build

# ============================================================
# Stage 2: Production — serve the static SPA via nginx
# ============================================================
FROM nginx:stable-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config from inside the docker/ folder (relative to repo root)
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
