# ----------------------
# 1. Dev environment
# ----------------------
FROM oven/bun:latest AS dev
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

# ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
# ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

COPY package.json bun.lock ./

# Clean bun cache + install fresh deps
RUN rm -rf /root/.bun/install/cache && bun install --no-cache

COPY . .
RUN bunx prisma generate

EXPOSE 3000
CMD ["bun", "run", "dev"]

# ----------------------
# 2. Base deps
# ----------------------
FROM oven/bun:latest AS deps
WORKDIR /app

# install openssl supaya prisma engine bisa jalan
RUN apt-get update -y && apt-get install -y openssl

# env supaya prisma gak fallback ke npm
# ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
# ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ----------------------
# 2. Builder
# ----------------------
FROM oven/bun:latest AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl
# ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
# ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun install --frozen-lockfile

# generate prisma client pakai bun
RUN bunx prisma generate

# build next.js
RUN bun run build

# ----------------------
# 3. Runner (standalone)
# ----------------------
FROM oven/bun:latest AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update -y && apt-get install -y openssl

# Copy node_modules dari builder, bukan cuma standalone
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./ 
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/app/generated/prisma ./app/generated/prisma

EXPOSE 3000
CMD ["bun", "server.js"]