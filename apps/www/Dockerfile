# Use Node.js 24 LTS (Debian Slim)
FROM node:24-slim AS base

# Base dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user early
RUN groupadd nodejs && useradd --gid nodejs --uid 1001 --create-home ngrok

# Set working directory
WORKDIR /app

ENV CI=true

# Install pnpm at the version pinned in root package.json#packageManager, the
# same source mise reads. pnpm's install script must run: it links the native
# binary over the Node launcher. The version check runs from / because pnpm
# writes an env lockfile into any project directory it runs in.
COPY package.json ./
COPY scripts/package-manager-version scripts/
RUN npm install --global "pnpm@$(scripts/package-manager-version)" \
    && test "$(cd / && pnpm --version)" = "$(scripts/package-manager-version)" \
    && rm -r package.json scripts

# Pruner stage — generates a minimal workspace containing only @app/www and
# the workspace packages it depends on (@ngrok/mantle, mantle-vite-plugins,
# mantle-server-syntax-highlighter, @cfg/tsconfig). turbo prune rewrites the
# lockfile and workspace manifest down to that subset, so anything @app/www
# does not depend on is dropped from this point forward.
FROM base AS pruner

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps apps
COPY packages packages
COPY config config

# Install turbo at the version declared in package.json (avoids installing all root devDeps)
RUN TURBO_VERSION=$(node -e "process.stdout.write(require('./package.json').devDependencies.turbo)") && \
    npm install -g turbo@$TURBO_VERSION

RUN --mount=type=secret,id=TURBO_TOKEN \
    --mount=type=secret,id=TURBO_TEAM \
    export TURBO_TOKEN=$(cat /run/secrets/TURBO_TOKEN || echo "") && \
    export TURBO_TEAM=$(cat /run/secrets/TURBO_TEAM || echo "") && \
    export DO_NOT_TRACK=1 && \
    export TURBO_TELEMETRY_DISABLED=1 && \
    turbo prune @app/www --docker

# Builder stage — works entirely within the pruned workspace
FROM base AS builder
WORKDIR /app

# Copy pruned package.json files first for better layer caching
COPY --from=pruner /app/out/json/ ./

# Install ALL dependencies (devDeps needed for build)
# Note: turbo prune generates a subset lockfile — skip frozen-lockfile
#
# The store lives on a BuildKit cache mount, which is a separate filesystem.
# pnpm moves its default store onto the project's filesystem in that case, so
# name the store dir explicitly. Imports across filesystems copy instead of
# clone.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --no-frozen-lockfile --store-dir /pnpm/store

# Copy full pruned source
COPY --from=pruner /app/out/full/ ./

# Build
RUN --mount=type=secret,id=TURBO_TOKEN \
    --mount=type=secret,id=TURBO_TEAM \
    export TURBO_TOKEN=$(cat /run/secrets/TURBO_TOKEN || echo "") && \
    export TURBO_TEAM=$(cat /run/secrets/TURBO_TEAM || echo "") && \
    export NODE_ENV=production && \
    export DO_NOT_TRACK=1 && \
    export TURBO_TELEMETRY_DISABLED=1 && \
    pnpm turbo run build --filter=@app/www...

# Install only @react-router/serve + its runtime deps into a clean directory
# so we can copy a minimal node_modules into the distroless runner.
RUN RR_SERVE_VERSION=$(node -e "process.stdout.write(require('./apps/www/node_modules/@react-router/serve/package.json').version)") \
    && mkdir /app/runner-deps && cd /app/runner-deps \
    && npm init -y \
    && npm install --omit=dev --no-fund --no-audit "@react-router/serve@${RR_SERVE_VERSION}" \
    && rm -rf package.json package-lock.json

# ---------------------------------------------------------------------------
# Runner stage — Distroless, no shell/npm/package manager.
# App deps are bundled into the server build (ssr.noExternal: true).
# Only @react-router/serve + its runtime deps (express, etc.) are copied in.
# ---------------------------------------------------------------------------
FROM gcr.io/distroless/nodejs24-debian12 AS runner

WORKDIR /app

COPY --from=builder --chown=1001:1001 /app/apps/www/build build
COPY --from=builder --chown=1001:1001 /app/runner-deps/node_modules node_modules

USER 1001

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node_modules/.bin/react-router-serve", "build/server/index.js"]
