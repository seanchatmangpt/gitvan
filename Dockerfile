# GitVan Production Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build dependencies and UnRDF submodule
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /build

# Install git for submodule handling
RUN apk add --no-cache git

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Initialize and build UnRDF submodule
RUN git submodule update --init --recursive && \
    cd vendor/unrdf && \
    npm ci && \
    npm run build && \
    cd ../..

# Build GitVan
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    tini \
    dumb-init

# Create app user
RUN addgroup -g 1001 -S gitvan && \
    adduser -u 1001 -S gitvan -G gitvan

# Set working directory
WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder --chown=gitvan:gitvan /build/dist ./dist
COPY --from=builder --chown=gitvan:gitvan /build/node_modules ./node_modules
COPY --from=builder --chown=gitvan:gitvan /build/package.json ./
COPY --from=builder --chown=gitvan:gitvan /build/gitvan.config.js ./

# Copy RDF ontologies and queries
COPY --from=builder --chown=gitvan:gitvan /build/src/rdf ./src/rdf

# Create data directories
RUN mkdir -p /data/graph /data/benchmarks /data/logs && \
    chown -R gitvan:gitvan /data

# Set environment variables
ENV NODE_ENV=production \
    TZ=UTC \
    LANG=C \
    GITVAN_HOME=/data \
    GITVAN_GRAPH_DIR=/data/graph

# Switch to app user
USER gitvan

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["node", "dist/cli.mjs"]

# Expose ports (if GitVan serves HTTP)
EXPOSE 3000

# Labels
LABEL org.opencontainers.image.title="GitVan" \
      org.opencontainers.image.description="Git-native development automation platform with RDF" \
      org.opencontainers.image.version="3.0.0" \
      org.opencontainers.image.vendor="GitVan Team"
