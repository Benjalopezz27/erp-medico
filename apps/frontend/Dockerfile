# ==============================================================================
# Stage 1: Build the Vite React SPA
# ==============================================================================
FROM node:24.19.0-alpine3.24@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS builder

ARG VITE_API_URL=/api/v1
ARG APP_VERSION=0.1.0
ARG APP_COMMIT_SHA=development

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile

COPY packages/shared-types/ ./packages/shared-types/
COPY apps/frontend/ ./apps/frontend/

RUN pnpm --filter @erp/shared-types run build

ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm --filter @erp/frontend run build

# Generate deterministic version.json
RUN echo "{\"version\":\"${APP_VERSION}\",\"commitSha\":\"${APP_COMMIT_SHA}\"}" > /workspace/apps/frontend/dist/version.json

# ==============================================================================
# Stage 2: Serve SPA with unprivileged Nginx
# ==============================================================================
FROM nginxinc/nginx-unprivileged:1.30.4-alpine3.24-slim@sha256:e88d990b349df8cf4aa82f16642d7a23375016638c9ace4e5c6ca25028e62e65 AS runner

ARG APP_VERSION=0.1.0
ARG APP_COMMIT_SHA=development

LABEL org.opencontainers.image.title="ERP Distribuidora Médica - Frontend SPA" \
      org.opencontainers.image.description="Vite/React Production SPA container served by Nginx for ERP Distribuidora Médica" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${APP_COMMIT_SHA}" \
      org.opencontainers.image.source="https://github.com/Benjalopezz27/erp-medico" \
      org.opencontainers.image.vendor="Benjamin Lopez"

COPY apps/frontend/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /workspace/apps/frontend/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
