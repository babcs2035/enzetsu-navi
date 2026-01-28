FROM node:25.4.0-bookworm AS base

RUN npm install -g pnpm@10.28.1

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build
RUN npx tsc prisma/seed.ts --module commonjs --target es2020 --moduleResolution node --skipLibCheck --allowSyntheticDefaultImports

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN pnpx playwright@1.58.0 install-deps chromium
RUN pnpx playwright@1.58.0 install chromium

RUN chown -R nextjs:nodejs $PLAYWRIGHT_BROWSERS_PATH

COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.js ./prisma/seed.js

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node prisma/seed.js && node server.js"]
