# ============================================================
# Stage 1: Dependencies
# Build context is the REPO ROOT, so all paths start from there.
# Only production deps are installed — devDependencies are omitted.
# ============================================================
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only lockfiles first — maximises layer cache hits on rebuilds
COPY server/package.json server/package-lock.json ./

RUN npm ci --omit=dev

# ============================================================
# Stage 2: Production image
# ============================================================
FROM node:22-alpine AS runner

# dumb-init: ensures Node receives OS signals (SIGTERM on docker stop)
# so the server shuts down gracefully instead of being force-killed.
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create a non-root user for security (principle of least privilege)
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 expressjs

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (relative to repo root).
# .dockerignore already excludes node_modules, .env, logs, tmp, uploads.
COPY server/ .

# Rotation scripts are dev/maintenance tools — remove from the prod image
# so they cannot be executed inside a running container.
RUN rm -f rotate-secrets.js rotate-better-auth.js

# Create runtime directories and assign ownership to the non-root user
RUN mkdir -p uploads logs tmp \
    && chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 5000

# NODE_ENV default — docker-compose.yml overrides this at runtime
ENV NODE_ENV=production

# Health check: poll the /api/health endpoint every 30 s.
# Allows docker-compose depends_on: condition: service_healthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/health || exit 1

# dumb-init as PID 1 ensures signals propagate correctly to Node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
