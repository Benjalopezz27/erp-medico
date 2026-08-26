# ==============================================================================
# Stage 1: Base image with pnpm and tini
# ==============================================================================
FROM node:26.7.0-alpine3.24@sha256:aadf416b2cdce311a8811ba3f0608a61b77dbf997500e2eafe781b51f6a0b019 AS base

RUN apk add --no-cache tini
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /workspace

# ==============================================================================
# Stage 2: Install dependencies
# ==============================================================================
FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile

# ==============================================================================
# Stage 3: Build shared packages and NestJS backend
# ==============================================================================
FROM dependencies AS builder

COPY packages/shared-types/ ./packages/shared-types/
COPY apps/backend/ ./apps/backend/

# Build shared types first, then backend
RUN pnpm --filter @erp/shared-types run build
RUN pnpm --filter @erp/backend run build

# ==============================================================================
# Stage 4: Prune production bundle using pnpm deploy
# ==============================================================================
FROM builder AS deployer

RUN pnpm --filter @erp/backend --prod deploy /prod/backend

# ==============================================================================
# Stage 5: Production runner (minimal, non-root)
# ==============================================================================
FROM node:26.7.0-alpine3.24@sha256:aadf416b2cdce311a8811ba3f0608a61b77dbf997500e2eafe781b51f6a0b019 AS runner

ARG RAILWAY_GIT_COMMIT_SHA=development
ARG APP_VERSION=0.1.0
ARG APP_COMMIT_SHA=${RAILWAY_GIT_COMMIT_SHA}

LABEL org.opencontainers.image.title="ERP Distribuidora Médica - Backend API" \
      org.opencontainers.image.description="NestJS Production API container for ERP Distribuidora Médica" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${APP_COMMIT_SHA}" \
      org.opencontainers.image.source="https://github.com/Benjalopezz27/erp-medico" \
      org.opencontainers.image.vendor="Benjamin Lopez"

RUN apk add --no-cache tini \
    && addgroup -g 10001 -S appgroup \
    && adduser -u 10001 -S appuser -G appgroup \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx /usr/local/bin/yarn /usr/local/bin/yarnpkg

WORKDIR /app

COPY --from=deployer --chown=appuser:appgroup /prod/backend /app

# The Nest Swagger compiler emits runtime enum metadata relative to the
# workspace package. Keep only its compiled artifact at the expected path.
COPY --from=builder --chown=appuser:appgroup /workspace/packages/shared-types/dist /packages/shared-types/dist

ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=${APP_VERSION} \
    APP_COMMIT_SHA=${APP_COMMIT_SHA} \
    RAILWAY_GIT_COMMIT_SHA=${RAILWAY_GIT_COMMIT_SHA}

USER appuser:appgroup

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/v1/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
