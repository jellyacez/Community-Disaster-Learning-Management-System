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

# Copy application source (relative to repo root)
COPY server/ .

# Create the uploads directory and set ownership
RUN mkdir -p uploads logs tmp \
    && chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server.js"]
