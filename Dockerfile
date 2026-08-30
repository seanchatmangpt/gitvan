# syntax=docker/dockerfile:1

ARG NODE_IMAGE="node:22.23.1-alpine3.24@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2"

FROM ${NODE_IMAGE} AS builder
WORKDIR /build

RUN npm install --global corepack@0.35.0 \
  && corepack enable \
  && corepack install --global pnpm@11.21.0 \
  && test "$(pnpm --version)" = "11.21.0"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm test:enterprise \
  && pnpm build \
  && pnpm prune --prod

FROM ${NODE_IMAGE} AS runtime

RUN apk add --no-cache git tini \
  && rm -rf /usr/local/lib/node_modules/npm /opt/yarn-* \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/corepack

WORKDIR /app

COPY --from=builder --chown=node:node /build/dist ./dist
COPY --from=builder --chown=node:node /build/node_modules ./node_modules
COPY --from=builder --chown=node:node /build/package.json ./package.json

RUN mkdir -p /data \
  && chown -R node:node /data

ENV NODE_ENV=production \
    TZ=UTC \
    LANG=C \
    GITVAN_HOME=/data

USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ["node", "dist/bin/gitvan.mjs", "--version"]

ENTRYPOINT ["/sbin/tini", "--", "node", "dist/bin/gitvan.mjs"]
CMD ["--help"]

LABEL org.opencontainers.image.title="GitVan" \
      org.opencontainers.image.description="Git-native development automation with bounded enterprise actuation" \
      org.opencontainers.image.version="4.0.1" \
      org.opencontainers.image.vendor="GitVan Team" \
      org.opencontainers.image.source="https://github.com/seanchatmangpt/gitvan"
