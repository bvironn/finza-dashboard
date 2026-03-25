# ─── Build (Bun) ─────────────────────────────────────────────────
FROM oven/bun:1 AS build
WORKDIR /build

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ─── Production ──────────────────────────────────────────────────
FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /build/dist ./dist

EXPOSE 3001

CMD ["node", "dist/server/entry.mjs"]
