# apps/web/Dockerfile
FROM node:18-alpine AS alpine
RUN apk update && apk add --no-cache libc6-compat

# --- Stage 1: Prune ---
FROM alpine AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune web --docker

# --- Stage 2: Install ---
FROM alpine AS installer
WORKDIR /app
RUN npm install -g pnpm

COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# --- Stage 3: Build ---
FROM alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

ARG NEXT_PUBLIC_HTTP_BACKEND
ENV NEXT_PUBLIC_HTTP_BACKEND=$NEXT_PUBLIC_HTTP_BACKEND
ARG NEXT_PUBLIC_WS_BACKEND
ENV NEXT_PUBLIC_WS_BACKEND=$NEXT_PUBLIC_WS_BACKEND

RUN pnpm turbo run build --filter=web...

# --- Stage 4: Runner ---
FROM alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

ENV PORT 3000
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
