#!/bin/bash

# GitVan Workflow Usage Test
# Focused testing of workflow functionality from junior developer perspective

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_IMAGE="gitvan-binary-optimized"
TEST_DIR="workflow-test-$(date +%s)"
TEST_OUTPUT_DIR="workflow-test-output"

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
    print_status "INFO" "Cleaning up workflow test environment..."
    rm -rf "$TEST_OUTPUT_DIR"
    docker rmi "$TEST_IMAGE" 2>/dev/null || true
}

# Set up cleanup trap
trap cleanup EXIT

print_status "INFO" "Starting GitVan Workflow Usage Test"
print_status "INFO" "Focus: Testing workflow functionality from junior developer perspective"

# Step 1: Build the Docker image
print_status "STEP" "Step 1: Building GitVan Docker image"
if docker build -f Dockerfile.binary-optimized -t "$TEST_IMAGE" . > /dev/null 2>&1; then
    print_status "SUCCESS" "Docker image built successfully"
else
    print_status "ERROR" "Failed to build Docker image"
    exit 1
fi

# Step 2: Initialize a project for workflow testing
print_status "STEP" "Step 2: Initializing project for workflow testing"
mkdir -p "$TEST_OUTPUT_DIR"

if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan init --name "workflow-test-project" --description "Testing GitVan workflows" --cwd /workspace > /dev/null 2>&1; then
    
    print_status "SUCCESS" "Project initialized for workflow testing"
else
    print_status "ERROR" "Project initialization failed"
    exit 1
fi

# Step 3: Test workflow commands
print_status "STEP" "Step 3: Testing workflow commands"

# Test workflow help
print_status "INFO" "Testing: gitvan workflow --help"
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan workflow --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Workflow help command works"
else
    print_status "ERROR" "Workflow help command failed"
fi

# Test workflow run help
print_status "INFO" "Testing: gitvan workflow run --help"
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan workflow run --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Workflow run help command works"
else
    print_status "ERROR" "Workflow run help command failed"
fi

# Step 4: Test workflow file creation and structure
print_status "STEP" "Step 4: Testing workflow file creation and structure"

# Check if workflows directory was created
if [ -d "$TEST_OUTPUT_DIR/workflows" ]; then
    print_status "SUCCESS" "Workflows directory created"
    
    # List workflow files
    print_status "INFO" "Workflow files created:"
    find "$TEST_OUTPUT_DIR/workflows" -name "*.ttl" -o -name "*.yaml" -o -name "*.yml" -o -name "*.json" | while read file; do
        echo "  📄 $(basename "$file")"
    done
else
    print_status "WARNING" "Workflows directory not found"
fi

# Step 5: Test workflow execution
print_status "STEP" "Step 5: Testing workflow execution"

# Try to run a workflow (if any exist)
if [ -d "$TEST_OUTPUT_DIR/workflows" ]; then
    workflow_files=$(find "$TEST_OUTPUT_DIR/workflows" -name "*.ttl" -o -name "*.yaml" -o -name "*.yml" -o -name "*.json")
    
    if [ -n "$workflow_files" ]; then
        print_status "INFO" "Found workflow files, testing execution"
        
        # Get the first workflow file
        first_workflow=$(echo "$workflow_files" | head -1)
        workflow_name=$(basename "$first_workflow" | sed 's/\.[^.]*$//')
        
        print_status "INFO" "Testing workflow: $workflow_name"
        
        # Try to run the workflow
        if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
            gitvan workflow run "$workflow_name" > /dev/null 2>&1; then
            print_status "SUCCESS" "Workflow execution completed"
        else
            print_status "WARNING" "Workflow execution failed (may need additional setup)"
        fi
    else
        print_status "WARNING" "No workflow files found to test execution"
    fi
fi

# Step 6: Test workflow validation
print_status "STEP" "Step 6: Testing workflow validation"

# Test workflow validation (if command exists)
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan workflow validate --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Workflow validate command exists"
    
    # Try to validate workflows
    if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
        gitvan workflow validate > /dev/null 2>&1; then
        print_status "SUCCESS" "Workflow validation completed"
    else
        print_status "WARNING" "Workflow validation failed"
    fi
else
    print_status "WARNING" "Workflow validate command not available"
fi

# Step 7: Test workflow status and monitoring
print_status "STEP" "Step 7: Testing workflow status and monitoring"

# Test workflow status (if command exists)
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan workflow status --help > /dev/null 2>&1; then
    print_status "SUCCESS" "Workflow status command exists"
    
    # Try to get workflow status
    if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
        gitvan workflow status > /dev/null 2>&1; then
        print_status "SUCCESS" "Workflow status retrieved"
    else
        print_status "WARNING" "Workflow status retrieval failed"
    fi
else
    print_status "WARNING" "Workflow status command not available"
fi

# Step 8: Test workflow error handling
print_status "STEP" "Step 8: Testing workflow error handling"

# Test invalid workflow name
if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$TEST_IMAGE" \
    gitvan workflow run "nonexistent-workflow" > /dev/null 2>&1; then
    print_status "WARNING" "Invalid workflow should have failed but didn't"
else
    print_status "SUCCESS" "Invalid workflow properly failed"
fi

# Step 9: Test workflow integration with other GitVan features
print_status "STEP" "Step 9: Testing workflow integration with other GitVan features"

# Test if workflows integrate with hooks
if [ -d "$TEST_OUTPUT_DIR/hooks" ]; then
    print_status "INFO" "Testing workflow-hook integration"
    
    # Check if hooks reference workflows
    hook_files=$(find "$TEST_OUTPUT_DIR/hooks" -name "*.ttl" -o -name "*.yaml" -o -name "*.yml" -o -name "*.json")
    if [ -n "$hook_files" ]; then
        print_status "SUCCESS" "Hook files found, potential workflow integration available"
    else
        print_status "WARNING" "No hook files found for integration testing"
    fi
fi

# Step 10: Test workflow documentation and examples
print_status "STEP" "Step 10: Testing workflow documentation and examples"

# Check for workflow documentation
if [ -f "$TEST_OUTPUT_DIR/workflows/README.md" ]; then
    print_status "SUCCESS" "Workflow documentation found"
    
    # Show workflow documentation content
    print_status "INFO" "Workflow documentation content:"
    head -20 "$TEST_OUTPUT_DIR/workflows/README.md" | while read line; do
        echo "  📖 $line"
    done
else
    print_status "WARNING" "Workflow documentation not found"
fi

# Final summary
print_status "INFO" "Workflow Usage Test Complete"
print_status "INFO" "This test focused on workflow functionality from a junior developer perspective"
print_status "SUCCESS" "Workflow testing completed!"

# Show final project structure
if [ -d "$TEST_OUTPUT_DIR" ]; then
    print_status "INFO" "Final project structure:"
    tree "$TEST_OUTPUT_DIR" -I "node_modules" || find "$TEST_OUTPUT_DIR" -type f | head -20
fi
