# -----------------------------------------------------------------------------
# Base Stage
# -----------------------------------------------------------------------------
FROM node:25.9.0-bookworm AS base
RUN npm install -g pnpm@10.33.2

# -----------------------------------------------------------------------------
# Dependency Stage
# -----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy package files first to leverage cache
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Install dependencies including devDependencies
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Prisma Generate Stage (run on build platform to avoid emulation issues)
# -----------------------------------------------------------------------------
FROM --platform=$BUILDPLATFORM node:25.9.0-bookworm AS prisma-gen
WORKDIR /app
RUN npm install -g pnpm@10.33.2

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --ignore-scripts

# prisma.config.ts requires DATABASE_URL, but generate does not need a real DB.
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm prisma generate

# -----------------------------------------------------------------------------
# Builder Stage
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy deps from deps stage to avoid reinstalling
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy generated Prisma Client from native build platform stage
COPY --from=prisma-gen /app/src/generated/prisma ./src/generated/prisma

# Run Next.js build directly to skip package.json's "prisma generate && next build"
RUN pnpm exec next build

# -----------------------------------------------------------------------------
# Runner Stage
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV HOME=/app
ENV XDG_CACHE_HOME=/app/.cache
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV TZ="Asia/Tokyo"

# Install system dependencies for Playwright first (cached unless base changes)
# Using pnpx is the standard package executor for pnpm
RUN pnpx playwright@1.59.1 install-deps chromium && \
    pnpx playwright@1.59.1 install chromium

# Prepare user and directories
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p .next .cache $PLAYWRIGHT_BROWSERS_PATH && \
    chown -R nextjs:nodejs .next .cache $PLAYWRIGHT_BROWSERS_PATH

# Install Prisma globally (needed for runtime CLI commands like db push)
# Using npm for global installs since npm is built-in to Node.js image
RUN npm install -g prisma@7.8.0 tsx@4.21.0

# Copy application artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files needed for seeding and schema ops
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Fix permissions for cache after global install
RUN chown -R nextjs:nodejs /app/.cache

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "prisma db push && tsx prisma/seed.ts && node server.js"]
