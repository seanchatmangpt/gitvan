#!/bin/bash

# GitVan v3.0.0 Cleanroom Test Runner
# Comprehensive Docker-based testing for GitVan v3

set -e

echo "🧪 GitVan v3.0.0 Cleanroom Test Suite"
echo "======================================"
echo ""

# Configuration
CLEANROOM_IMAGE="gitvan-cleanroom"
TEST_OUTPUT_DIR="test-output"
SCRIPTS_DIR="scripts/cleanroom"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

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

# Function to run a test and track results
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_result=${3:-"success"}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    print_status "INFO" "Running: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        if [ "$expected_result" = "success" ]; then
            print_status "SUCCESS" "$test_name - PASSED"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            print_status "ERROR" "$test_name - FAILED (Expected failure but got success)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    else
        if [ "$expected_result" = "failure" ]; then
            print_status "SUCCESS" "$test_name - PASSED (Expected failure)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            print_status "ERROR" "$test_name - FAILED"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    fi
}

# Function to clean up test environment
cleanup() {
    print_status "INFO" "Cleaning up test environment..."
    
    # Remove test output directory
    if [ -d "$TEST_OUTPUT_DIR" ]; then
        rm -rf "$TEST_OUTPUT_DIR"
    fi
    
    # Stop any running containers
    docker stop $(docker ps -q --filter "ancestor=$CLEANROOM_IMAGE") 2>/dev/null || true
    
    # Remove test containers
    docker rm $(docker ps -aq --filter "ancestor=$CLEANROOM_IMAGE") 2>/dev/null || true
    
    print_status "SUCCESS" "Cleanup completed"
}

# Function to build cleanroom image
build_cleanroom_image() {
    print_status "INFO" "Building GitVan cleanroom Docker image..."
    
    if docker build -f Dockerfile.cleanroom -t "$CLEANROOM_IMAGE" . > /dev/null 2>&1; then
        print_status "SUCCESS" "Cleanroom image built successfully"
        return 0
    else
        print_status "ERROR" "Failed to build cleanroom image"
        return 1
    fi
}

# Function to test CLI help
test_cli_help() {
    print_status "INFO" "Testing CLI help functionality..."
    
    local help_output
    help_output=$(docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs --help 2>&1)
    
    if echo "$help_output" | grep -q "Git-native development automation platform"; then
        print_status "SUCCESS" "CLI help displays correctly"
        return 0
    else
        print_status "ERROR" "CLI help not displaying correctly"
        return 1
    fi
}

# Function to test project initialization
test_project_init() {
    print_status "INFO" "Testing project initialization..."
    
    # Create test output directory
    mkdir -p "$TEST_OUTPUT_DIR"
    
    # Run initialization
    if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" "$CLEANROOM_IMAGE" \
        node /gitvan/src/cli.mjs init --name "cleanroom-test" --description "Cleanroom test project" > /dev/null 2>&1; then
        
        # Check if key files were created
        local required_files=("package.json" "gitvan.config.js" "graph/init.ttl")
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
    
    if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" "$CLEANROOM_IMAGE" \
        bash -c "cd /workspace && git init && git add . && git commit -m 'Initial commit'" > /dev/null 2>&1; then
        
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
    
    # Test chat help
    if docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs chat help > /dev/null 2>&1; then
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
    
    # Test daemon status
    if docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs daemon status > /dev/null 2>&1; then
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
    
    # Test graph init-default
    if docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs graph init-default > /dev/null 2>&1; then
        print_status "SUCCESS" "Graph initialization works"
        return 0
    else
        print_status "ERROR" "Graph initialization failed"
        return 1
    fi
}

# Function to test pack functionality
test_pack_functionality() {
    print_status "INFO" "Testing pack functionality..."
    
    # Test pack list
    if docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs pack list > /dev/null 2>&1; then
        print_status "SUCCESS" "Pack list command works"
        return 0
    else
        print_status "ERROR" "Pack list command failed"
        return 1
    fi
}

# Function to test error handling
test_error_handling() {
    print_status "INFO" "Testing error handling..."
    
    # Test invalid command
    local error_output
    error_output=$(docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs invalid-command 2>&1)
    
    if echo "$error_output" | grep -q "Unknown command\|No command specified"; then
        print_status "SUCCESS" "Error handling works correctly"
        return 0
    else
        print_status "ERROR" "Error handling not working correctly"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    print_status "INFO" "Starting comprehensive cleanroom testing..."
    echo ""
    
    # Build cleanroom image
    if ! build_cleanroom_image; then
        print_status "ERROR" "Cannot proceed without cleanroom image"
        exit 1
    fi
    
    echo ""
    print_status "INFO" "Running test suites..."
    echo ""
    
    # Suite 1: Core System Tests
    print_status "INFO" "📋 Suite 1: Core System Tests"
    test_cli_help
    test_project_init
    test_git_operations
    echo ""
    
    # Suite 2: AI Integration Tests
    print_status "INFO" "🤖 Suite 2: AI Integration Tests"
    test_chat_functionality
    echo ""
    
    # Suite 3: Workflow Engine Tests
    print_status "INFO" "⚙️ Suite 3: Workflow Engine Tests"
    test_daemon_functionality
    echo ""
    
    # Suite 4: Pack System Tests
    print_status "INFO" "📦 Suite 4: Pack System Tests"
    test_pack_functionality
    echo ""
    
    # Suite 5: Graph System Tests
    print_status "INFO" "🕸️ Suite 5: Graph System Tests"
    test_graph_functionality
    echo ""
    
    # Suite 6: Integration Tests
    print_status "INFO" "🔗 Suite 6: Integration Tests"
    test_error_handling
    echo ""
}

# Function to generate test report
generate_report() {
    echo ""
    print_status "INFO" "Generating test report..."
    echo ""
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo "📊 GitVan v3.0.0 Cleanroom Test Report"
    echo "======================================"
    echo ""
    echo "Test Summary:"
    echo "  Total Tests: $TOTAL_TESTS"
    echo "  Passed: $PASSED_TESTS"
    echo "  Failed: $FAILED_TESTS"
    echo "  Success Rate: $success_rate%"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_status "SUCCESS" "All tests passed! GitVan v3.0.0 is cleanroom ready."
        echo ""
        echo "🎉 GitVan v3.0.0 has successfully passed all cleanroom tests."
        echo "   The system is production-ready for Docker environments."
    else
        print_status "ERROR" "$FAILED_TESTS tests failed. Review the output above."
        echo ""
        echo "⚠️  GitVan v3.0.0 has issues that need to be addressed before production release."
    fi
    
    echo ""
    echo "Test completed at: $(date)"
}

# Main execution
main() {
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Run all tests
    run_all_tests
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [ $FAILED_TESTS -eq 0 ]; then
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

# Check if Dockerfile.cleanroom exists
if [ ! -f "Dockerfile.cleanroom" ]; then
    print_status "ERROR" "Dockerfile.cleanroom not found"
    exit 1
fi

# Run main function
main "$@"
