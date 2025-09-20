#!/bin/bash

# GitVan v3.0.0 Cleanroom Test Suite - Core System Tests
# Tests basic CLI functionality, project initialization, and Git operations

set -e

# Configuration
CLEANROOM_IMAGE="gitvan-cleanroom"
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

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    print_status "INFO" "Running: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_status "SUCCESS" "$test_name - PASSED"
        return 0
    else
        print_status "ERROR" "$test_name - FAILED"
        return 1
    fi
}

# Test 1: CLI Help Display
test_cli_help() {
    print_status "INFO" "Testing CLI help display..."
    
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

# Test 2: Command List Display
test_command_list() {
    print_status "INFO" "Testing command list display..."
    
    local command_output
    command_output=$(docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs 2>&1)
    
    if echo "$command_output" | grep -q "COMMANDS"; then
        print_status "SUCCESS" "Command list displays correctly"
        return 0
    else
        print_status "ERROR" "Command list not displaying correctly"
        return 1
    fi
}

# Test 3: Project Initialization
test_project_init() {
    print_status "INFO" "Testing project initialization..."
    
    # Create test output directory
    mkdir -p "$TEST_OUTPUT_DIR"
    
    # Run initialization
    if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" "$CLEANROOM_IMAGE" \
        node /gitvan/src/cli.mjs init --name "core-test" --description "Core system test project" > /dev/null 2>&1; then
        
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

# Test 4: Git Repository Initialization
test_git_init() {
    print_status "INFO" "Testing Git repository initialization..."
    
    if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" "$CLEANROOM_IMAGE" \
        bash -c "cd /workspace && git init" > /dev/null 2>&1; then
        
        if [ -d "$TEST_OUTPUT_DIR/.git" ]; then
            print_status "SUCCESS" "Git repository initialized successfully"
            return 0
        else
            print_status "ERROR" "Git repository not created"
            return 1
        fi
    else
        print_status "ERROR" "Git initialization failed"
        return 1
    fi
}

# Test 5: Git Add and Commit
test_git_operations() {
    print_status "INFO" "Testing Git add and commit operations..."
    
    if docker run --rm -v "$(pwd)/$TEST_OUTPUT_DIR:/workspace" "$CLEANROOM_IMAGE" \
        bash -c "cd /workspace && git add . && git commit -m 'Initial commit'" > /dev/null 2>&1; then
        
        print_status "SUCCESS" "Git add and commit operations completed successfully"
        return 0
    else
        print_status "ERROR" "Git add and commit operations failed"
        return 1
    fi
}

# Test 6: Error Handling
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

# Main test execution
main() {
    print_status "INFO" "Starting Core System Tests..."
    echo ""
    
    local tests_passed=0
    local tests_failed=0
    
    # Run all tests
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
    
    if test_git_init; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_git_operations; then
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
    print_status "INFO" "Core System Tests Summary:"
    echo "  Passed: $tests_passed"
    echo "  Failed: $tests_failed"
    echo "  Total: $((tests_passed + tests_failed))"
    
    if [ $tests_failed -eq 0 ]; then
        print_status "SUCCESS" "All core system tests passed!"
        exit 0
    else
        print_status "ERROR" "$tests_failed core system tests failed"
        exit 1
    fi
}

# Run main function
main "$@"
