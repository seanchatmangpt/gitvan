# GitVan Cleanroom Test Dockerfile - No Entrypoint Version
FROM node:20-alpine

# Install Git, pnpm, and other dependencies
RUN apk add --no-cache git bash && \
    npm install -g pnpm

# Set working directory
WORKDIR /workspace

# Copy only necessary files for GitVan
COPY package.json pnpm-lock.yaml /gitvan/
COPY src/ /gitvan/src/
COPY packs/ /gitvan/packs/

# Install GitVan dependencies
WORKDIR /gitvan
RUN pnpm install --no-frozen-lockfile

# Set working directory back to workspace
WORKDIR /workspace

# No entrypoint - allow direct command execution
