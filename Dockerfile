# ─── Build frontend with Node ──────────────────────────────────────
FROM node:22-slim AS frontend-build
WORKDIR /build
COPY packages/frontend/package.json ./
RUN npm install
COPY packages/frontend/ ./
COPY package.json /build/root-pkg.json
RUN VERSION=$(node -e "console.log(require('./root-pkg.json').version)") && \
    VITE_APP_VERSION=$VERSION npx vite build

# ─── Production (Bun runtime) ─────────────────────────────────────
FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock ./
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN bun install

COPY packages/backend/ packages/backend/
COPY --from=frontend-build /build/dist packages/backend/frontend-dist

WORKDIR /app/packages/backend
EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
