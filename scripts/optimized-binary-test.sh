#!/bin/bash

# GitVan Optimized Binary Docker Test
# Tests the unbuild-optimized GitVan in Docker

set -e

echo "🧪 GitVan Optimized Binary Docker Test"
echo "======================================"
echo ""

# Configuration
OPTIMIZED_IMAGE="gitvan-binary-optimized"
TEST_DIR="optimized-binary-test"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
    esac
}

# Function to build optimized container
build_optimized_container() {
    print_status "INFO" "Building optimized GitVan Docker container..."
    
    if docker build -f Dockerfile.binary-optimized -t "$OPTIMIZED_IMAGE" . > /dev/null 2>&1; then
        print_status "SUCCESS" "Optimized container built successfully"
        return 0
    else
        print_status "ERROR" "Failed to build optimized container"
        return 1
    fi
}

# Function to test GitVan commands
test_gitvan_command() {
    local command=$1
    local description=$2
    
    print_status "INFO" "Testing: $description"
    echo "Command: $command"
    echo "Output:"
    
    if docker run --rm "$OPTIMIZED_IMAGE" $command 2>&1; then
        print_status "SUCCESS" "$description completed"
    else
        print_status "ERROR" "$description failed"
    fi
    echo ""
}

# Function to test project initialization
test_project_init() {
    print_status "INFO" "Testing project initialization..."
    
    # Create test output directory
    mkdir -p "$TEST_DIR"
    
    # Run initialization
    if docker run --rm -v "$(pwd)/$TEST_DIR:/workspace" -w /workspace "$OPTIMIZED_IMAGE" \
        gitvan init --name "optimized-test" --description "Optimized binary test project" --cwd /workspace > /dev/null 2>&1; then
        
        # Check if key files were created
        local required_files=("package.json" "gitvan.config.js")
        local all_files_exist=true
        
        for file in "${required_files[@]}"; do
            if [ ! -f "$TEST_DIR/$file" ]; then
                all_files_exist=false
                break
            fi
        done
        
        if [ "$all_files_exist" = true ]; then
            print_status "SUCCESS" "Project initialization completed successfully"
            return 0
        else
            print_status "ERROR" "Project initialization missing required files"
            return 1
        fi
    else
        print_status "ERROR" "Project initialization failed"
        return 1
    fi
}

# Function to show file structure
show_file_structure() {
    print_status "INFO" "File structure after initialization:"
    echo "=================================="
    
    if [ -d "$TEST_DIR" ]; then
        # Show only GitVan files, not node_modules
        find "$TEST_DIR" -type f -not -path "*/node_modules/*" | head -20
        echo ""
        echo "Total GitVan files: $(find "$TEST_DIR" -type f -not -path "*/node_modules/*" | wc -l)"
    else
        print_status "WARNING" "Test directory not found"
    fi
    echo ""
}

# Function to cleanup
cleanup() {
    print_status "INFO" "Cleaning up test files..."
    rm -rf "$TEST_DIR"
    print_status "SUCCESS" "Cleanup completed"
}

# Main test execution
main() {
    # Build container
    if ! build_optimized_container; then
        exit 1
    fi
    
    echo ""
    print_status "INFO" "Running GitVan command tests..."
    echo "======================================"
    
    # Test basic commands
    test_gitvan_command "gitvan --help" "GitVan Help"
    test_gitvan_command "gitvan init --help" "Init Help"
    test_gitvan_command "gitvan chat --help" "Chat Help"
    test_gitvan_command "gitvan pack --help" "Pack Help"
    
    echo ""
    print_status "INFO" "Running project initialization test..."
    echo "=============================================="
    
    # Test project initialization
    if test_project_init; then
        show_file_structure
    fi
    
    echo ""
    print_status "SUCCESS" "All tests completed!"
    echo "========================"
    
    # Cleanup
    cleanup
}

# Run main function
main
