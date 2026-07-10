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
ENV COREPACK_HOME=/tmp/corepack-cache
ENV XDG_CACHE_HOME=$COREPACK_HOME
ENV PNPM_HOME=/root/.pnpm-store

RUN mkdir -p $COREPACK_HOME \
    && chmod -R 777 $COREPACK_HOME

# Enable corepack for pnpm
RUN npm install --global corepack@latest && corepack enable pnpm

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

# Enable and install pnpm via corepack (uses the root package.json#packageManager field)
RUN yes | corepack enable pnpm \
    && yes | corepack install

# Install ALL dependencies (devDeps needed for build)
# Note: turbo prune generates a subset lockfile — skip frozen-lockfile
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm store verify || true && \
    pnpm install --no-frozen-lockfile

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
