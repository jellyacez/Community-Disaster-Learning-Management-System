# ============================================================
# Stage 1: Dependencies
# Build context is the REPO ROOT, so all paths start from there.
# ============================================================
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only package files first for better layer caching
COPY server/package.json server/package-lock.json ./

RUN npm ci --omit=dev

# ============================================================
# Stage 2: Production image
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 expressjs

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (relative to repo root).
# Rotate scripts are dev/maintenance tools — exclude them from the prod image.
COPY server/ .
RUN rm -f rotate-secrets.js rotate-better-auth.js

# Copy database migrations so the startup script can run them
COPY server/migrations ./migrations

# Create the uploads, logs, and tmp directories and set ownership
RUN mkdir -p uploads logs tmp \
    && chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 5000

# NODE_ENV is set here as a default; docker-compose.yml should set it to
# "production" in the environment block (overrides this at runtime).
ENV NODE_ENV=production

# Use npm start so the entrypoint is always driven by package.json
CMD ["npm", "start"]
