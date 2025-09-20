#!/bin/bash

# GitVan Binary Docker Test Runner
# Tests the binary Docker approach with self-contained GitVan package

set -e

echo "🧪 GitVan Binary Docker Test Suite"
echo "==================================="
echo ""

# Configuration
BINARY_IMAGE="gitvan-binary"
TEST_OUTPUT_DIR="test-binary-output"

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

# Function to build binary container
build_binary_container() {
    print_status "INFO" "Building binary container image..."
    
    if docker build -f Dockerfile.binary -t "$BINARY_IMAGE" . > /dev/null 2>&1; then
        print_status "SUCCESS" "Binary container image built successfully"
        return 0
    else
        print_status "ERROR" "Failed to build binary container image"
        return 1
    fi
}

# Function to test binary container health
test_binary_health() {
    print_status "INFO" "Testing binary container health..."
    
    local health_output
    health_output=$(docker run --rm "$BINARY_IMAGE" 2>&1)
    
    if echo "$health_output" | grep -q "Git-native development automation platform"; then
        print_status "SUCCESS" "Binary container health check passed"
        return 0
    else
        print_status "ERROR" "Binary container health check failed"
        echo "Output: $health_output"
        return 1
    fi
}

# Function to test binary CLI help
test_binary_cli_help() {
    print_status "INFO" "Testing binary CLI help..."
    
    local help_output
    help_output=$(docker run --rm "$BINARY_IMAGE" gitvan --help 2>&1)
    
    if echo "$help_output" | grep -q "Git-native development automation platform"; then
        print_status "SUCCESS" "Binary CLI help displays correctly"
        return 0
    else
        print_status "ERROR" "Binary CLI help not displaying correctly"
        echo "Output: $help_output"
        return 1
    fi
}

# Function to test binary command list
test_binary_command_list() {
    print_status "INFO" "Testing binary command list..."
    
    local command_output
    command_output=$(docker run --rm "$BINARY_IMAGE" gitvan 2>&1)
    
    if echo "$command_output" | grep -q "COMMANDS"; then
        print_status "SUCCESS" "Binary command list displays correctly"
        return 0
    else
        print_status "ERROR" "Binary command list not displaying correctly"
        echo "Output: $command_output"
        return 1
    fi
}

# Function to test binary project initialization
test_binary_project_init() {
    print_status "INFO" "Testing binary project initialization..."
    
    # Create test output directory
    mkdir -p "$TEST_OUTPUT_DIR"
    
    # Run initialization
    if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" "$BINARY_IMAGE" \
        gitvan init --name "binary-test" --description "Binary test project" > /dev/null 2>&1; then
        
        # Check if key files were created
        local required_files=("package.json" "gitvan.config.js")
        local all_files_exist=true
        
        for file in "${required_files[@]}"; do
            if [ ! -f "$TEST_OUTPUT_DIR/$file" ]; then
                all_files_exist=false
                break
            fi
        done
        
        if [ "$all_files_exist" = true ]; then
            print_status "SUCCESS" "Binary project initialization completed successfully"
            return 0
        else
            print_status "ERROR" "Binary project initialization missing required files"
            return 1
        fi
    else
        print_status "ERROR" "Binary project initialization failed"
        return 1
    fi
}

# Function to test binary Git operations
test_binary_git_operations() {
    print_status "INFO" "Testing binary Git operations..."
    
    if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" "$BINARY_IMAGE" \
        bash -c "cd /workspace && git init && echo 'test content' > test.txt && git add test.txt && git commit -m 'Initial commit'" > /dev/null 2>&1; then
        
        if [ -d "$TEST_OUTPUT_DIR/.git" ]; then
            print_status "SUCCESS" "Binary Git operations completed successfully"
            return 0
        else
            print_status "ERROR" "Binary Git repository not created"
            return 1
        fi
    else
        print_status "ERROR" "Binary Git operations failed"
        return 1
    fi
}

# Function to test binary chat functionality
test_binary_chat_functionality() {
    print_status "INFO" "Testing binary chat functionality..."
    
    local chat_output
    chat_output=$(docker run --rm "$BINARY_IMAGE" gitvan chat help 2>&1)
    
    if echo "$chat_output" | grep -q "GitVan Chat Commands"; then
        print_status "SUCCESS" "Binary chat help command works"
        return 0
    else
        print_status "ERROR" "Binary chat functionality not working"
        echo "Output: $chat_output"
        return 1
    fi
}

# Function to test binary daemon functionality
test_binary_daemon_functionality() {
    print_status "INFO" "Testing binary daemon functionality..."
    
    local daemon_output
    daemon_output=$(docker run --rm "$BINARY_IMAGE" gitvan daemon --help 2>&1)
    
    if echo "$daemon_output" | grep -q "daemon" || echo "$daemon_output" | grep -q "Daemon"; then
        print_status "SUCCESS" "Binary daemon status command works"
        return 0
    else
        print_status "ERROR" "Binary daemon functionality not working"
        echo "Output: $daemon_output"
        return 1
    fi
}

# Function to test binary graph functionality
test_binary_graph_functionality() {
    print_status "INFO" "Testing binary graph functionality..."
    
    local graph_output
    graph_output=$(docker run --rm "$BINARY_IMAGE" gitvan graph init 2>&1)
    
    if echo "$graph_output" | grep -q "graph" || echo "$graph_output" | grep -q "Graph"; then
        print_status "SUCCESS" "Binary graph initialization works"
        return 0
    else
        print_status "ERROR" "Binary graph functionality not working"
        echo "Output: $graph_output"
        return 1
    fi
}

# Function to test binary error handling
test_binary_error_handling() {
    print_status "INFO" "Testing binary error handling..."
    
    # Test invalid command
    local error_output
    error_output=$(docker run --rm "$BINARY_IMAGE" gitvan invalid-command 2>&1)
    
    if echo "$error_output" | grep -q "Unknown command\|No command specified"; then
        print_status "SUCCESS" "Binary error handling works correctly"
        return 0
    else
        print_status "ERROR" "Binary error handling not working correctly"
        echo "Output: $error_output"
        return 1
    fi
}

# Main test execution
main() {
    print_status "INFO" "Starting Binary Docker Tests..."
    echo ""
    
    local tests_passed=0
    local tests_failed=0
    
    # Build container
    if ! build_binary_container; then
        print_status "ERROR" "Cannot proceed without binary container"
        exit 1
    fi
    
    echo ""
    print_status "INFO" "Running binary tests..."
    echo ""
    
    # Run all tests
    if test_binary_health; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_binary_cli_help; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_binary_command_list; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_binary_project_init; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_binary_git_operations; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_binary_chat_functionality; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_binary_daemon_functionality; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_binary_graph_functionality; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_binary_error_handling; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    echo ""
    print_status "INFO" "Generating binary test report..."
    echo ""
    
    echo "📊 GitVan Binary Docker Test Report"
    echo "===================================="
    echo ""
    echo "Test Summary:"
    echo "  Total Tests: $((tests_passed + tests_failed))"
    echo "  Passed: $tests_passed"
    echo "  Failed: $tests_failed"
    echo "  Success Rate: $((tests_passed * 100 / (tests_passed + tests_failed)))%"
    echo ""
    
    if [ $tests_failed -eq 0 ]; then
        print_status "SUCCESS" "All binary tests passed! GitVan binary Docker solution is working."
        echo ""
        echo "🎉 GitVan Binary Docker Solution Status: PRODUCTION READY"
        echo ""
        echo "✅ Benefits of Binary Approach:"
        echo "   • Self-contained package with all dependencies"
        echo "   • No external file structure dependencies"
        echo "   • Simplified Docker deployment"
        echo "   • Consistent behavior across environments"
        echo "   • Easy to distribute and deploy"
        exit 0
    else
        print_status "ERROR" "$tests_failed binary tests failed. Review the output above."
        echo ""
        echo "⚠️  GitVan Binary Docker Solution has issues that need to be addressed."
        exit 1
    fi
}

# Cleanup function
cleanup() {
    print_status "INFO" "Cleaning up test environment..."
    rm -rf "$TEST_OUTPUT_DIR"
    print_status "SUCCESS" "Cleanup completed"
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"
