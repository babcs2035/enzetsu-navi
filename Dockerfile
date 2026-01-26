FROM node:22-bookworm AS base

# pnpmの準備
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# 依存関係インストール
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# 本番実行
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Playwright の依存関係とブラウザのインストール
# 注意: 本番環境でのスクレイピング用に必要
RUN npx playwright install-deps chromium
RUN npx playwright install chromium

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Standaloneモードのファイルをコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
