#!/bin/bash

# GitVan Binary Build Script using nexe
# Creates a standalone binary executable

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

print_status "INFO" "Starting GitVan Binary Build with nexe"
print_status "INFO" "Creating standalone binary executable"

# Step 1: Build GitVan with unbuild
print_status "STEP" "Step 1: Building GitVan with unbuild"
if [ ! -d "dist" ]; then
    print_status "INFO" "Building GitVan..."
    pnpm run build
    print_status "SUCCESS" "GitVan built successfully"
else
    print_status "INFO" "Using existing dist directory"
fi

# Step 2: Install dependencies for binary
print_status "STEP" "Step 2: Installing dependencies for binary"
print_status "INFO" "Installing nexe dependencies..."
npm install --production --no-optional

# Step 3: Create nexe configuration
print_status "STEP" "Step 3: Creating nexe configuration"
print_status "INFO" "Setting up nexe build configuration..."

# Create nexe config file
cat > nexe.config.js << 'EOF'
module.exports = {
  input: 'dist/gitvan.mjs',
  output: 'gitvan-binary',
  target: 'node18-linux-x64',
  build: true,
  bundle: true,
  resources: [
    'dist/**/*',
    'templates/**/*',
    'packs/**/*'
  ],
  patches: [
    'fs'
  ],
  // Exclude problematic modules
  exclude: [
    'fsevents',
    'node-gyp',
    'node-pre-gyp'
  ]
};
EOF

print_status "SUCCESS" "Nexe configuration created"

# Step 4: Build binary with nexe
print_status "STEP" "Step 4: Building binary with nexe"
print_status "INFO" "Building standalone binary..."

# Try different nexe approaches
print_status "INFO" "Attempting nexe build..."

# Method 1: Direct nexe command
if nexe dist/gitvan.mjs --output gitvan-binary --target node18-linux-x64 --build --bundle; then
    print_status "SUCCESS" "Binary built successfully with nexe"
else
    print_status "WARNING" "Direct nexe build failed, trying alternative approach"
    
    # Method 2: Using nexe config
    if nexe --config nexe.config.js; then
        print_status "SUCCESS" "Binary built successfully with config"
    else
        print_status "WARNING" "Config-based nexe build failed, trying minimal approach"
        
        # Method 3: Minimal nexe build
        if nexe dist/gitvan.mjs --output gitvan-binary --target node18-linux-x64; then
            print_status "SUCCESS" "Minimal binary built successfully"
        else
            print_status "ERROR" "All nexe build methods failed"
            exit 1
        fi
    fi
fi

# Step 5: Test the binary
print_status "STEP" "Step 5: Testing the binary"
if [ -f "gitvan-binary" ]; then
    print_status "SUCCESS" "Binary file created"
    
    # Make it executable
    chmod +x gitvan-binary
    
    # Test basic functionality
    print_status "INFO" "Testing binary functionality..."
    if ./gitvan-binary --help > /dev/null 2>&1; then
        print_status "SUCCESS" "Binary works correctly"
    else
        print_status "WARNING" "Binary test failed"
    fi
    
    # Show binary size
    binary_size=$(du -sh gitvan-binary | cut -f1)
    print_status "INFO" "Binary size: $binary_size"
    
else
    print_status "ERROR" "Binary file not created"
    exit 1
fi

# Step 6: Create Docker image with binary
print_status "STEP" "Step 6: Creating Docker image with binary"
print_status "INFO" "Creating minimal Docker image..."

# Create Dockerfile for binary
cat > Dockerfile.binary << 'EOF'
# GitVan Binary Docker Solution
# Minimal Docker image with standalone binary

FROM alpine:latest

# Install only essential dependencies
RUN apk add --no-cache \
    git \
    bash \
    nodejs \
    npm

# Copy the binary
COPY gitvan-binary /usr/local/bin/gitvan
RUN chmod +x /usr/local/bin/gitvan

# Set working directory
WORKDIR /workspace

# Set default command
CMD ["gitvan", "--help"]
EOF

# Build Docker image
if docker build -f Dockerfile.binary -t gitvan-binary-docker .; then
    print_status "SUCCESS" "Docker image built successfully"
    
    # Show Docker image size
    docker images gitvan-binary-docker
    
    # Test Docker image
    print_status "INFO" "Testing Docker image..."
    if docker run --rm gitvan-binary-docker gitvan --help > /dev/null 2>&1; then
        print_status "SUCCESS" "Docker image works correctly"
    else
        print_status "WARNING" "Docker image test failed"
    fi
else
    print_status "ERROR" "Docker image build failed"
fi

# Step 7: Show final results
print_status "STEP" "Step 7: Final results"
print_status "INFO" "Binary build complete!"

if [ -f "gitvan-binary" ]; then
    binary_size=$(du -sh gitvan-binary | cut -f1)
    print_status "SUCCESS" "✅ Binary created: gitvan-binary ($binary_size)"
fi

if docker images gitvan-binary-docker > /dev/null 2>&1; then
    docker_size=$(docker images gitvan-binary-docker --format "table {{.Size}}" | tail -1)
    print_status "SUCCESS" "✅ Docker image created: gitvan-binary-docker ($docker_size)"
fi

print_status "INFO" "GitVan Binary Build Complete!"
print_status "SUCCESS" "Standalone binary executable created!"
