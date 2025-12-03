#!/bin/bash

# Post-Unbuild Optimization Pipeline
# Further reduces binary size after unbuild compilation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print status function
print_status() {
    local level=$1
    local message=$2
    case $level in
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "STEP")
            echo -e "${BLUE}🔍 $message${NC}"
            ;;
    esac
}

print_status "INFO" "Starting Post-Unbuild Optimization Pipeline"
print_status "INFO" "Further reducing binary size after unbuild compilation"

# Step 1: Install optimization tools
print_status "STEP" "Step 1: Installing optimization tools"
npm install -g terser node-prune @babel/core @babel/preset-env

# Step 2: Minify the built JavaScript files
print_status "STEP" "Step 2: Minifying JavaScript files"
if [ -d "dist" ]; then
    print_status "INFO" "Minifying dist/*.mjs files"
    
    # Find all .mjs files and minify them
    find dist -name "*.mjs" -type f | while read file; do
        print_status "INFO" "Minifying $file"
        
        # Create backup
        cp "$file" "$file.backup"
        
        # Minify with terser
        terser "$file" \
            --compress \
            --mangle \
            --output "$file.min" \
            --source-map "url=$file.min.map"
        
        # Replace original with minified version
        mv "$file.min" "$file"
        
        print_status "SUCCESS" "Minified $file"
    done
else
    print_status "WARNING" "No dist directory found"
fi

# Step 3: Remove unnecessary files from node_modules
print_status "STEP" "Step 3: Pruning node_modules"
if [ -d "node_modules" ]; then
    print_status "INFO" "Pruning node_modules directory"
    
    # Remove common unnecessary files
    find node_modules -name "*.md" -type f -delete
    find node_modules -name "*.txt" -type f -delete
    find node_modules -name "*.map" -type f -delete
    find node_modules -name "*.ts" -type f -delete
    find node_modules -name "*.d.ts" -type f -delete
    find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true
    find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true
    find node_modules -name "docs" -type d -exec rm -rf {} + 2>/dev/null || true
    find node_modules -name "examples" -type d -exec rm -rf {} + 2>/dev/null || true
    find node_modules -name "*.test.js" -type f -delete
    find node_modules -name "*.spec.js" -type f -delete
    
    print_status "SUCCESS" "Pruned node_modules directory"
else
    print_status "WARNING" "No node_modules directory found"
fi

# Step 4: Use node-prune for advanced pruning
print_status "STEP" "Step 4: Advanced node_modules pruning"
if command -v node-prune &> /dev/null; then
    print_status "INFO" "Running node-prune"
    node-prune
    print_status "SUCCESS" "Advanced pruning completed"
else
    print_status "WARNING" "node-prune not available, skipping advanced pruning"
fi

# Step 5: Remove development dependencies
print_status "STEP" "Step 5: Removing development dependencies"
if [ -f "package.json" ]; then
    print_status "INFO" "Installing only production dependencies"
    npm install --production --no-optional
    print_status "SUCCESS" "Development dependencies removed"
else
    print_status "WARNING" "No package.json found"
fi

# Step 6: Analyze bundle composition
print_status "STEP" "Step 6: Analyzing bundle composition"
if [ -d "dist" ]; then
    print_status "INFO" "Analyzing dist directory"
    
    # Show file sizes
    print_status "INFO" "Dist directory file sizes:"
    du -sh dist/*
    
    # Show total size
    total_size=$(du -sh dist | cut -f1)
    print_status "INFO" "Total dist size: $total_size"
else
    print_status "WARNING" "No dist directory found"
fi

# Step 7: Create optimized package.json
print_status "STEP" "Step 7: Creating optimized package.json"
if [ -f "package.json" ]; then
    print_status "INFO" "Creating production-optimized package.json"
    
    # Create a minimal package.json for production
    cat > package.prod.json << EOF
{
  "name": "gitvan-optimized",
  "version": "3.0.0",
  "description": "GitVan optimized for production",
  "type": "module",
  "main": "dist/cli.mjs",
  "bin": {
    "gitvan": "dist/gitvan.mjs"
  },
  "dependencies": {
    "citty": "^0.1.6",
    "consola": "^3.4.2",
    "unctx": "^2.4.1",
    "pathe": "^2.0.3",
    "defu": "^6.1.4",
    "klona": "^2.0.6",
    "lru-cache": "^11.2.1",
    "zod": "^4.1.9",
    "tinyglobby": "^0.2.15",
    "gray-matter": "^4.0.3",
    "js-yaml": "^4.1.0",
    "json5": "^2.2.3",
    "inflection": "^3.0.2",
    "nunjucks": "^3.2.4",
    "hookable": "^5.5.3",
    "unrouting": "^0.0.1",
    "giget": "^1.2.1",
    "prompts": "^2.4.2",
    "minimatch": "^10.0.3",
    "semver": "^7.7.2"
  }
}
EOF
    
    print_status "SUCCESS" "Created optimized package.json"
else
    print_status "WARNING" "No package.json found"
fi

# Step 8: Create optimized Dockerfile
print_status "STEP" "Step 8: Creating optimized Dockerfile"
cat > Dockerfile.post-optimized << 'EOF'
# GitVan Post-Optimized Docker Solution
# Uses post-unbuild optimization techniques

# Builder stage: Build and optimize GitVan
FROM node:20-alpine AS builder

# Install build tools
RUN npm install -g pnpm terser node-prune

# Set working directory
WORKDIR /app

# Copy source files
COPY package.json pnpm-lock.yaml ./
COPY src/ ./src/
COPY bin/ ./bin/
COPY templates/ ./templates/
COPY packs/ ./packs/
COPY build.config.ts ./

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm run build

# Post-build optimization
RUN find dist -name "*.mjs" -type f | while read file; do \
        terser "$file" --compress --mangle --output "$file.min"; \
        mv "$file.min" "$file"; \
    done

# Prune node_modules
RUN find node_modules -name "*.md" -type f -delete && \
    find node_modules -name "*.txt" -type f -delete && \
    find node_modules -name "*.map" -type f -delete && \
    find node_modules -name "*.ts" -type f -delete && \
    find node_modules -name "*.d.ts" -type f -delete && \
    find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "docs" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "examples" -type d -exec rm -rf {} + 2>/dev/null || true

# Runtime stage: Minimal production image
FROM node:20-alpine

# Install only essential system dependencies
RUN apk add --no-cache git bash

# Copy optimized GitVan package
COPY --from=builder /app/dist /gitvan/dist
COPY --from=builder /app/templates /gitvan/templates
COPY --from=builder /app/packs /gitvan/packs
COPY package.prod.json /gitvan/package.json

# Install only production dependencies
WORKDIR /gitvan
RUN npm install --production --no-optional

# Create wrapper script
RUN echo '#!/bin/sh' > /usr/local/bin/gitvan && \
    echo 'cd /gitvan && node dist/bin/gitvan.mjs "$@"' >> /usr/local/bin/gitvan && \
    chmod +x /usr/local/bin/gitvan

# Set working directory
WORKDIR /workspace

# Set default command
CMD ["gitvan", "--help"]
EOF

print_status "SUCCESS" "Created optimized Dockerfile"

# Step 9: Show optimization results
print_status "STEP" "Step 9: Optimization results"
if [ -d "dist" ]; then
    print_status "INFO" "Final optimization results:"
    print_status "SUCCESS" "✅ JavaScript files minified"
    print_status "SUCCESS" "✅ Unnecessary files removed from node_modules"
    print_status "SUCCESS" "✅ Development dependencies removed"
    print_status "SUCCESS" "✅ Optimized Dockerfile created"
    print_status "SUCCESS" "✅ Production package.json created"
    
    # Show final sizes
    print_status "INFO" "Final sizes:"
    if [ -d "dist" ]; then
        du -sh dist
    fi
    if [ -d "node_modules" ]; then
        du -sh node_modules
    fi
else
    print_status "WARNING" "No dist directory found for final analysis"
fi

print_status "INFO" "Post-Unbuild Optimization Pipeline Complete"
print_status "SUCCESS" "Binary size optimization completed!"
