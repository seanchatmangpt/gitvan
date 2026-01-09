#!/bin/bash
# GitVan Submodule Validation Script
# This script validates that all git submodules are properly configured and initialized

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# Helper functions
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

log_info() {
    echo -e "ℹ️  $1"
}

# Main validation logic
main() {
    log_info "Starting GitVan submodule validation..."
    echo ""

    # Check 1: Verify .gitmodules exists
    log_info "Check 1: Verifying .gitmodules file exists..."
    if [ -f .gitmodules ]; then
        log_success ".gitmodules file exists"
    else
        log_error ".gitmodules file not found!"
        exit 1
    fi

    # Check 2: Validate .gitmodules syntax
    log_info "Check 2: Validating .gitmodules syntax..."
    if git config --file .gitmodules --list > /dev/null 2>&1; then
        log_success ".gitmodules syntax is valid"
    else
        log_error ".gitmodules has invalid syntax!"
        exit 1
    fi

    # Check 3: Count configured submodules
    log_info "Check 3: Counting configured submodules..."
    SUBMODULE_COUNT=$(git config --file .gitmodules --get-regexp path | wc -l)
    if [ "$SUBMODULE_COUNT" -gt 0 ]; then
        log_success "Found $SUBMODULE_COUNT configured submodule(s)"
    else
        log_warning "No submodules configured in .gitmodules"
    fi

    # Check 4: Verify each submodule path exists
    log_info "Check 4: Verifying submodule paths exist..."
    while IFS= read -r line; do
        SUBMODULE_PATH=$(echo "$line" | awk '{print $2}')
        if [ -e "$SUBMODULE_PATH" ]; then
            log_success "Submodule path exists: $SUBMODULE_PATH"
        else
            log_error "Submodule path missing: $SUBMODULE_PATH"
        fi
    done < <(git config --file .gitmodules --get-regexp path)

    # Check 5: Verify vendor/unrdf submodule specifically
    log_info "Check 5: Verifying vendor/unrdf submodule..."
    if [ -d "vendor/unrdf" ]; then
        log_success "vendor/unrdf directory exists"

        if [ -f "vendor/unrdf/package.json" ]; then
            log_success "vendor/unrdf/package.json exists"

            # Check if it's a valid npm package
            if command -v node > /dev/null 2>&1; then
                if node -e "require('./vendor/unrdf/package.json')" 2>/dev/null; then
                    log_success "vendor/unrdf/package.json is valid JSON"
                else
                    log_warning "vendor/unrdf/package.json may have syntax issues"
                fi
            fi
        else
            log_error "vendor/unrdf/package.json not found"
        fi

        # Check if the submodule has a .git directory or file
        if [ -e "vendor/unrdf/.git" ]; then
            log_success "vendor/unrdf is a valid git repository"
        else
            log_warning "vendor/unrdf/.git not found - may not be initialized"
        fi
    else
        log_error "vendor/unrdf directory not found"
    fi

    # Check 6: Verify submodule URLs are accessible
    log_info "Check 6: Verifying submodule URLs..."
    while IFS= read -r line; do
        SUBMODULE_URL=$(echo "$line" | awk '{print $2}')
        SUBMODULE_NAME=$(echo "$line" | awk '{print $1}' | sed 's/submodule\.\(.*\)\.url/\1/')

        log_info "Checking URL for $SUBMODULE_NAME: $SUBMODULE_URL"

        if git ls-remote --exit-code "$SUBMODULE_URL" HEAD > /dev/null 2>&1; then
            log_success "URL is accessible: $SUBMODULE_URL"
        else
            log_error "URL is not accessible: $SUBMODULE_URL"
        fi
    done < <(git config --file .gitmodules --get-regexp url)

    # Check 7: Verify submodule status
    log_info "Check 7: Checking submodule status..."
    if git submodule status > /dev/null 2>&1; then
        log_success "Submodule status command successful"

        # Show status details
        log_info "Submodule status details:"
        git submodule status | while IFS= read -r status_line; do
            echo "    $status_line"
        done
    else
        log_warning "Could not get submodule status"
    fi

    # Check 8: Verify submodule commits are in sync
    log_info "Check 8: Checking if submodule commits are in sync..."
    if git diff --quiet --cached -- .gitmodules; then
        log_success "No staged changes to .gitmodules"
    else
        log_warning "There are staged changes to .gitmodules"
    fi

    # Check 9: Check for modified submodules
    log_info "Check 9: Checking for modified submodules..."
    MODIFIED_SUBMODULES=$(git submodule foreach --quiet --recursive 'git diff --quiet || echo $name')
    if [ -z "$MODIFIED_SUBMODULES" ]; then
        log_success "No modified files in submodules"
    else
        log_warning "Found modified files in submodules:"
        echo "$MODIFIED_SUBMODULES" | while IFS= read -r submodule; do
            echo "    - $submodule"
        done
    fi

    # Check 10: Verify git config has submodule settings
    log_info "Check 10: Verifying git config has submodule settings..."
    if git config --get-regexp '^submodule\.' > /dev/null 2>&1; then
        log_success "Git config has submodule settings"
    else
        log_warning "Git config does not have submodule settings (may need init)"
    fi

    # Summary
    echo ""
    echo "=================================="
    echo "Validation Summary"
    echo "=================================="
    log_info "Checks passed: $CHECKS_PASSED"
    if [ $CHECKS_FAILED -gt 0 ]; then
        log_error "Checks failed: $CHECKS_FAILED"
    else
        echo -e "${GREEN}Checks failed: 0${NC}"
    fi
    if [ $WARNINGS -gt 0 ]; then
        log_warning "Warnings: $WARNINGS"
    else
        echo -e "${GREEN}Warnings: 0${NC}"
    fi
    echo ""

    if [ $CHECKS_FAILED -gt 0 ]; then
        log_error "Submodule validation failed!"
        exit 1
    elif [ $WARNINGS -gt 0 ]; then
        log_warning "Submodule validation completed with warnings"
        exit 0
    else
        log_success "All submodule validation checks passed!"
        exit 0
    fi
}

# Run main function
main "$@"
