#!/bin/bash

# GitVan v3.0.0 Cleanroom Test Suite - AI Integration Tests
# Tests chat functionality, AI integration, and job generation

set -e

# Configuration
CLEANROOM_IMAGE="gitvan-cleanroom"

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

# Test 1: Chat Help Command
test_chat_help() {
    print_status "INFO" "Testing chat help command..."
    
    if docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs chat help > /dev/null 2>&1; then
        print_status "SUCCESS" "Chat help command works"
        return 0
    else
        print_status "ERROR" "Chat help command failed"
        return 1
    fi
}

# Test 2: Chat Subcommands
test_chat_subcommands() {
    print_status "INFO" "Testing chat subcommands..."
    
    local subcommands=("draft" "generate" "preview" "apply" "explain" "design")
    local all_passed=true
    
    for subcommand in "${subcommands[@]}"; do
        if docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs chat "$subcommand" --help > /dev/null 2>&1; then
            print_status "SUCCESS" "Chat $subcommand subcommand works"
        else
            print_status "ERROR" "Chat $subcommand subcommand failed"
            all_passed=false
        fi
    done
    
    if [ "$all_passed" = true ]; then
        print_status "SUCCESS" "All chat subcommands work correctly"
        return 0
    else
        print_status "ERROR" "Some chat subcommands failed"
        return 1
    fi
}

# Test 3: Chat Command Error Handling
test_chat_error_handling() {
    print_status "INFO" "Testing chat command error handling..."
    
    # Test invalid chat subcommand
    local error_output
    error_output=$(docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs chat invalid-subcommand 2>&1)
    
    if echo "$error_output" | grep -q "Unknown chat subcommand\|Unknown command"; then
        print_status "SUCCESS" "Chat error handling works correctly"
        return 0
    else
        print_status "ERROR" "Chat error handling not working correctly"
        return 1
    fi
}

# Test 4: AI Configuration Handling
test_ai_config_handling() {
    print_status "INFO" "Testing AI configuration handling..."
    
    # Test chat command without AI provider (should handle gracefully)
    if docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs chat draft "test prompt" > /dev/null 2>&1; then
        print_status "SUCCESS" "AI configuration handling works"
        return 0
    else
        # Check if it's a graceful error (not a crash)
        local error_output
        error_output=$(docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs chat draft "test prompt" 2>&1)
        
        if echo "$error_output" | grep -q "AI provider\|configuration\|not configured"; then
            print_status "SUCCESS" "AI configuration error handling works"
            return 0
        else
            print_status "ERROR" "AI configuration handling failed"
            return 1
        fi
    fi
}

# Test 5: Chat Command Arguments
test_chat_arguments() {
    print_status "INFO" "Testing chat command arguments..."
    
    # Test chat command with various argument combinations
    local test_cases=(
        "chat --help"
        "chat help"
        "chat draft --help"
        "chat generate --help"
    )
    
    local all_passed=true
    
    for test_case in "${test_cases[@]}"; do
        if docker run --rm "$CLEANROOM_IMAGE" node /gitvan/src/cli.mjs $test_case > /dev/null 2>&1; then
            print_status "SUCCESS" "Chat argument test passed: $test_case"
        else
            print_status "ERROR" "Chat argument test failed: $test_case"
            all_passed=false
        fi
    done
    
    if [ "$all_passed" = true ]; then
        print_status "SUCCESS" "All chat argument tests passed"
        return 0
    else
        print_status "ERROR" "Some chat argument tests failed"
        return 1
    fi
}

# Main test execution
main() {
    print_status "INFO" "Starting AI Integration Tests..."
    echo ""
    
    local tests_passed=0
    local tests_failed=0
    
    # Run all tests
    if test_chat_help; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_chat_subcommands; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_chat_error_handling; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_ai_config_handling; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    if test_chat_arguments; then
        tests_passed=$((tests_passed + 1))
    else
        tests_failed=$((tests_failed + 1))
    fi
    
    echo ""
    print_status "INFO" "AI Integration Tests Summary:"
    echo "  Passed: $tests_passed"
    echo "  Failed: $tests_failed"
    echo "  Total: $((tests_passed + tests_failed))"
    
    if [ $tests_failed -eq 0 ]; then
        print_status "SUCCESS" "All AI integration tests passed!"
        exit 0
    else
        print_status "ERROR" "$tests_failed AI integration tests failed"
        exit 1
    fi
}

# Run main function
main "$@"
