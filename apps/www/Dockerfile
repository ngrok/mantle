# CI passes the Node version from `.nvmrc`. With no default, a build without
# it fails.
ARG NODE_VERSION
FROM node:${NODE_VERSION}-slim AS base

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

# The build writes to the turbo remote cache, so the CI token needs the write host.
ARG TURBO_API

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
# `.nvmrc` is a turbo global dependency. Without it, a Node bump keeps the build
# hash, and the build can restore output from the previous Node.
COPY .nvmrc ./

# The build writes to the turbo remote cache, so the CI token needs the write host.
ARG TURBO_API

# Build
RUN --mount=type=secret,id=TURBO_TOKEN \
    --mount=type=secret,id=TURBO_TEAM \
    export TURBO_TOKEN=$(cat /run/secrets/TURBO_TOKEN || echo "") && \
    export TURBO_TEAM=$(cat /run/secrets/TURBO_TEAM || echo "") && \
    export NODE_ENV=production && \
    export DO_NOT_TRACK=1 && \
    export TURBO_TELEMETRY_DISABLED=1 && \
    pnpm turbo run build --filter=@app/www...

# Install only `@ngrok/app-server` and its runtime deps into a clean directory,
# at the version the app pins, so we can copy a minimal node_modules into the
# distroless runner. The app's `server/app.ts` and every app dependency are
# already bundled into `build/server/index.js`. Its peers (`react-router`,
# `vite`) are optional, so npm leaves them out.
RUN APP_SERVER_VERSION=$(node -e "process.stdout.write(require('./apps/www/node_modules/@ngrok/app-server/package.json').version)") \
    && mkdir /app/runner-deps && cd /app/runner-deps \
    && npm init -y \
    && npm install --omit=dev --no-fund --no-audit "@ngrok/app-server@${APP_SERVER_VERSION}" \
    && rm -rf package.json package-lock.json

# Node runtime stage — stages the Node files the runner copies, so `binutils`
# never reaches the runner.
# - `strip` removes the ELF symbol table, about 18 MB on amd64. Native frames
#   in core dumps, `perf`, and `--report` lose their names. JS stacks,
#   `--cpu-prof`, and heap snapshots do not change.
# - Node 25 and later link `libatomic.so.1`, which `cc-debian13` does not ship.
FROM base AS node-runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /node-runtime/nodejs/bin \
    && strip -o /node-runtime/nodejs/bin/node /usr/local/bin/node \
    && lib=$(dirname /usr/lib/*-linux-gnu/libatomic.so.1) \
    && mkdir -p "/node-runtime$lib" \
    && cp -a "$lib"/libatomic.so.1* "/node-runtime$lib/" \
    && /node-runtime/nodejs/bin/node -p process.version

# ---------------------------------------------------------------------------
# Runner stage — Distroless, no shell/npm/package manager.
# App deps are bundled into the server build (ssr.noExternal: true).
# Only `@ngrok/app-server` and its runtime deps are copied in.
# ---------------------------------------------------------------------------
# Distroless has no image per Node patch release, so copy Node from the
# node-runtime stage. `cc-debian13` has the CA bundle.
# `--use-openssl-ca` makes TLS verify against that bundle, not the roots built
# into Node.
FROM gcr.io/distroless/cc-debian13 AS runner

COPY --from=node-runtime /node-runtime/ /
ENTRYPOINT ["/nodejs/bin/node", "--use-openssl-ca"]

WORKDIR /app

COPY --from=builder --chown=1001:1001 /app/apps/www/build build
COPY --from=builder --chown=1001:1001 /app/runner-deps/node_modules node_modules

USER 1001

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node_modules/@ngrok/app-server/dist/cli.js", "serve", "build/server/index.js"]
