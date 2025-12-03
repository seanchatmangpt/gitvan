#!/bin/bash

# GitVan v3.0.0 Definitive Test Runner
# Uses the definitive Dockerfile with best practices from all existing Dockerfiles

set -e

echo "🧪 GitVan v3.0.0 Definitive Test Suite"
echo "======================================"
echo ""

# Configuration
DEFINITIVE_IMAGE="gitvan-definitive"
TEST_OUTPUT_DIR="test-output"

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

# Function to build definitive container
build_definitive_container() {
    print_status "INFO" "Building definitive container image..."
    
    if docker build -f Dockerfile.definitive -t "$DEFINITIVE_IMAGE" . > /dev/null 2>&1; then
        print_status "SUCCESS" "Definitive container image built successfully"
        return 0
    else
        print_status "ERROR" "Failed to build definitive container image"
        return 1
    fi
}

# Function to test container health
test_container_health() {
    print_status "INFO" "Testing container health..."
    
    local health_output
    health_output=$(docker run --rm "$DEFINITIVE_IMAGE" 2>&1)
    
    if echo "$health_output" | grep -q "GitVan v3.0.0 Docker Environment"; then
        print_status "SUCCESS" "Container health check passed"
        return 0
    else
        print_status "ERROR" "Container health check failed"
        echo "Output: $health_output"
        return 1
    fi
}

# Function to test CLI help
test_cli_help() {
    print_status "INFO" "Testing CLI help..."
    
    local help_output
    help_output=$(docker run --rm -v "$(pwd):/app" -w /app "$DEFINITIVE_IMAGE" node src/cli.mjs --help 2>&1)
    
    if echo "$help_output" | grep -q "Git-native development automation platform"; then
        print_status "SUCCESS" "CLI help displays correctly"
        return 0
    else
        print_status "ERROR" "CLI help not displaying correctly"
        echo "Output: $help_output"
        return 1
    fi
}

# Function to test command list
test_command_list() {
    print_status "INFO" "Testing command list..."
    
    local command_output
    command_output=$(docker run --rm -v "$(pwd):/app" -w /app "$DEFINITIVE_IMAGE" node src/cli.mjs 2>&1)
    
    if echo "$command_output" | grep -q "COMMANDS"; then
        print_status "SUCCESS" "Command list displays correctly"
        return 0
    else
        print_status "ERROR" "Command list not displaying correctly"
        echo "Output: $command_output"
        return 1
    fi
}

# Function to test project initialization
test_project_init() {
    print_status "INFO" "Testing project initialization..."
    
    # Create test output directory
    mkdir -p "$TEST_OUTPUT_DIR"
    
    # Run initialization
    if docker run --rm -v "$(pwd):/app" -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$DEFINITIVE_IMAGE" \
        node /app/src/cli.mjs init --name "definitive-test" --description "Definitive test project" > /dev/null 2>&1; then
        
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

# Function to test Git operations
test_git_operations() {
    print_status "INFO" "Testing Git operations..."
    
    if docker run --rm -v "$(pwd):/app" -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" -w /workspace "$DEFINITIVE_IMAGE" \
        bash -c "git init && echo 'test content' > test.txt && git add test.txt && git commit -m 'Initial commit'" > /dev/null 2>&1; then
        
        if [ -d "$TEST_OUTPUT_DIR/.git" ]; then
            print_status "SUCCESS" "Git operations completed successfully"
            return 0
        else
            print_status "ERROR" "Git repository not created"
            return 1
        fi
    else
        print_status "ERROR" "Git operations failed"
        return 1
    fi
}

# Function to test chat functionality
test_chat_functionality() {
    print_status "INFO" "Testing chat functionality..."
    
    if docker run --rm -v "$(pwd):/app" -w /app "$DEFINITIVE_IMAGE" node src/cli.mjs chat help > /dev/null 2>&1; then
        print_status "SUCCESS" "Chat help command works"
        return 0
    else
        print_status "ERROR" "Chat help command failed"
        return 1
    fi
}

# Function to test daemon functionality
test_daemon_functionality() {
    print_status "INFO" "Testing daemon functionality..."
    
    if docker run --rm -v "$(pwd):/app" -w /app "$DEFINITIVE_IMAGE" node src/cli.mjs daemon status > /dev/null 2>&1; then
        print_status "SUCCESS" "Daemon status command works"
        return 0
    else
        print_status "ERROR" "Daemon status command failed"
        return 1
    fi
}

# Function to test graph functionality
test_graph_functionality() {
    print_status "INFO" "Testing graph functionality..."
    
    if docker run --rm -v "$(pwd):/app" -w /app "$DEFINITIVE_IMAGE" node src/cli.mjs graph init-default > /dev/null 2>&1; then
        print_status "SUCCESS" "Graph initialization works"
        return 0
    else
        print_status "ERROR" "Graph initialization failed"
        return 1
    fi
}

# Function to test error handling
test_error_handling() {
    print_status "INFO" "Testing error handling..."
    
    local error_output
    error_output=$(docker run --rm -v "$(pwd):/app" -w /app "$DEFINITIVE_IMAGE" node src/cli.mjs invalid-command 2>&1)
    
    if echo "$error_output" | grep -q "Unknown command\|No command specified"; then
        print_status "SUCCESS" "Error handling works correctly"
        return 0
    else
        print_status "ERROR" "Error handling not working correctly"
        echo "Output: $error_output"
        return 1
    fi
}

# Function to test Git configuration
test_git_config() {
    print_status "INFO" "Testing Git configuration..."
    
    local git_config
    git_config=$(docker run --rm "$DEFINITIVE_IMAGE" git config --global user.name 2>&1)
    
    if echo "$git_config" | grep -q "GitVan Test User"; then
        print_status "SUCCESS" "Git configuration is correct"
        return 0
    else
        print_status "ERROR" "Git configuration is missing"
        echo "Output: $git_config"
        return 1
    fi
}

# Function to clean up
cleanup() {
    print_status "INFO" "Cleaning up test environment..."
    
    # Remove test output directory
    if [ -d "$TEST_OUTPUT_DIR" ]; then
        rm -rf "$TEST_OUTPUT_DIR"
    fi
    
    print_status "SUCCESS" "Cleanup completed"
}

# Main test execution
main() {
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Build definitive container
    if ! build_definitive_container; then
        print_status "ERROR" "Cannot proceed without definitive container image"
        exit 1
    fi
    
    echo ""
    print_status "INFO" "Running definitive tests..."
    echo ""
    
    local tests_passed=0
    local tests_failed=0
    
    # Run all tests
    if test_container_health; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_git_config; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_cli_help; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_command_list; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_project_init; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_git_operations; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_chat_functionality; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_daemon_functionality; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_graph_functionality; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_error_handling; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    echo ""
    print_status "INFO" "Generating test report..."
    echo ""
    
    local success_rate=0
    if [ $((tests_passed + tests_failed)) -gt 0 ]; then
        success_rate=$((tests_passed * 100 / (tests_passed + tests_failed)))
    fi
    
    echo "📊 GitVan v3.0.0 Definitive Test Report"
    echo "========================================"
    echo ""
    echo "Test Summary:"
    echo "  Total Tests: $((tests_passed + tests_failed))"
    echo "  Passed: $tests_passed"
    echo "  Failed: $tests_failed"
    echo "  Success Rate: $success_rate%"
    echo ""
    
    if [ $tests_failed -eq 0 ]; then
        print_status "SUCCESS" "All tests passed! GitVan v3.0.0 is working perfectly."
        echo ""
        echo "🎉 GitVan v3.0.0 has successfully passed all definitive tests."
        echo "   The system is production-ready for Docker environments."
    else
        print_status "ERROR" "$tests_failed tests failed. Review the output above."
        echo ""
        echo "⚠️  GitVan v3.0.0 has issues that need to be addressed before production release."
    fi
    
    echo ""
    echo "Test completed at: $(date)"
    
    # Exit with appropriate code
    if [ $tests_failed -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_status "ERROR" "Docker is not installed or not available"
    exit 1
fi

# Check if Dockerfile.definitive exists
if [ ! -f "Dockerfile.definitive" ]; then
    print_status "ERROR" "Dockerfile.definitive not found"
    exit 1
fi

# Run main function
main "$@"
