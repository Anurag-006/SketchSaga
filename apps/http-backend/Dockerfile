# apps/http-backend/Dockerfile
FROM node:18-alpine AS alpine
# Prisma requires libc6-compat and openssl in Alpine
RUN apk update && apk add --no-cache libc6-compat openssl

# --- Stage 1: Prune ---
FROM alpine AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .

RUN turbo prune http-backend --docker

# --- Stage 2: Install ---
FROM alpine AS installer
WORKDIR /app
RUN npm install -g pnpm

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# --- Stage 3: Build ---
FROM alpine AS builder
WORKDIR /app
RUN npm install -g pnpm

# Copy the installed dependencies and the actual source code
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

# Generate Prisma Client BEFORE building
RUN pnpm --filter database db:generate

# Build the specific app and its local dependencies
RUN pnpm turbo run build --filter=http-backend...

# --- Stage 4: Runner ---
FROM alpine AS runner
WORKDIR /app
RUN apk update && apk add --no-cache openssl

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

COPY --from=builder /app/ .

CMD ["node", "apps/http-backend/dist/index.js"]
