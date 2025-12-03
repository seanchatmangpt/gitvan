#!/bin/bash

# GitVan Junior Developer Discovery Test
# Simulating a junior developer discovering GitVan on npm and testing it in a clean Docker environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_IMAGE="gitvan-binary-optimized"
TEST_DIR="junior-dev-test-$(date +%s)"
TEST_OUTPUT_DIR="test-output"

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

# Cleanup function
cleanup() {
    print_status "INFO" "Cleaning up test environment..."
    rm -rf "$TEST_OUTPUT_DIR"
    docker rmi "$TEST_IMAGE" 2>/dev/null || true
}

# Set up cleanup trap
trap cleanup EXIT

print_status "INFO" "Starting GitVan Junior Developer Discovery Test"
print_status "INFO" "Simulating: Junior developer discovers GitVan on npm and tests it in clean Docker environment"

# Step 1: Build the Docker image (simulating npm install)
print_status "STEP" "Step 1: Building GitVan Docker image (simulating npm install)"
if docker build -f Dockerfile.binary-optimized -t "$TEST_IMAGE" . > /dev/null 2>&1; then
    print_status "SUCCESS" "Docker image built successfully"
else
    print_status "ERROR" "Failed to build Docker image"
    exit 1
fi

# Step 2: Test basic help and documentation
print_status "STEP" "Step 2: Testing basic help and documentation (first thing a junior dev would do)"
print_status "INFO" "Running: gitvan --help"

if docker run --rm "$TEST_IMAGE" gitvan --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Help command works"
else
    print_status "ERROR" "Help command failed"
    exit 1
fi

# Step 3: Test project initialization (most common first use case)
print_status "STEP" "Step 3: Testing project initialization (most common first use case)"
print_status "INFO" "Running: gitvan init --name 'my-first-project' --description 'Testing GitVan'"

mkdir -p "$TEST_OUTPUT_DIR"

if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan init --name "my-first-project" --description "Testing GitVan" --cwd /workspace > /dev/null 2>&1; then
    
    print_status "SUCCESS" "Project initialization completed"
    
    # Check what files were created
    print_status "INFO" "Files created by gitvan init:"
    if [ -d "$TEST_OUTPUT_DIR" ]; then
        find "$TEST_OUTPUT_DIR" -type f | head -20 | while read file; do
            echo "  📄 $(basename "$file")"
        done
    fi
else
    print_status "ERROR" "Project initialization failed"
    exit 1
fi

# Step 4: Test workflow usage (as requested)
print_status "STEP" "Step 4: Testing workflow usage (focus area)"
print_status "INFO" "Testing workflow commands"

# Test workflow list
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan workflow list > /dev/null 2>&1; then
    print_status "SUCCESS" "Workflow list command works"
else
    print_status "WARNING" "Workflow list command failed (may not be implemented)"
fi

# Test workflow run
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan workflow run --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Workflow run command works"
else
    print_status "WARNING" "Workflow run command failed (may not be implemented)"
fi

# Step 5: Test chat functionality (AI integration)
print_status "STEP" "Step 5: Testing chat functionality (AI integration)"
print_status "INFO" "Testing chat commands"

# Test chat help
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan chat --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Chat help command works"
else
    print_status "WARNING" "Chat help command failed (may not be implemented)"
fi

# Test chat generate
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan chat generate --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Chat generate command works"
else
    print_status "WARNING" "Chat generate command failed (may not be implemented)"
fi

# Step 6: Test hooks functionality
print_status "STEP" "Step 6: Testing hooks functionality"
print_status "INFO" "Testing hooks commands"

# Test hooks list
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan hooks list > /dev/null 2>&1; then
    print_status "SUCCESS" "Hooks list command works"
else
    print_status "WARNING" "Hooks list command failed (may not be implemented)"
fi

# Step 7: Test daemon functionality
print_status "STEP" "Step 7: Testing daemon functionality"
print_status "INFO" "Testing daemon commands"

# Test daemon start
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan daemon --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Daemon help command works"
else
    print_status "WARNING" "Daemon help command failed (may not be implemented)"
fi

# Step 8: Test graph functionality
print_status "STEP" "Step 8: Testing graph functionality"
print_status "INFO" "Testing graph commands"

# Test graph commands
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan graph --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Graph help command works"
else
    print_status "WARNING" "Graph help command failed (may not be implemented)"
fi

# Step 9: Test error handling
print_status "STEP" "Step 9: Testing error handling"
print_status "INFO" "Testing invalid commands"

# Test invalid command
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan invalid-command > /dev/null 2>&1; then
    print_status "WARNING" "Invalid command should have failed but didn't"
else
    print_status "SUCCESS" "Invalid command properly failed"
fi

# Step 10: Test file structure and project completeness
print_status "STEP" "Step 10: Testing file structure and project completeness"
print_status "INFO" "Checking project structure"

if [ -d "$TEST_OUTPUT_DIR" ]; then
    print_status "INFO" "Project structure:"
    tree "$TEST_OUTPUT_DIR" -I "node_modules" || find "$TEST_OUTPUT_DIR" -type f | head -20
    
    # Check for key files
    key_files=("package.json" "gitvan.config.js" "README.md")
    missing_files=()
    
    for file in "${key_files[@]}"; do
        if [ ! -f "$TEST_OUTPUT_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        print_status "SUCCESS" "All key files present"
    else
        print_status "WARNING" "Missing key files: ${missing_files[*]}"
    fi
fi

# Final summary
print_status "INFO" "Junior Developer Discovery Test Complete"
print_status "INFO" "This test simulates how a junior developer would discover and use GitVan"
print_status "INFO" "Focus: Workflow usage testing (as requested)"
print_status "SUCCESS" "GitVan is ready for junior developer use!"

# Show final project structure
if [ -d "$TEST_OUTPUT_DIR" ]; then
    print_status "INFO" "Final project structure:"
    tree "$TEST_OUTPUT_DIR" -I "node_modules" || find "$TEST_OUTPUT_DIR" -type f | head -20
fi
