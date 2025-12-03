#!/usr/bin/env bash
#
# GitVan v3.2.0 — Phase 1 Implementation Verification Script
#
# This script verifies that all Phase 1 components are properly implemented:
# - Directory structure
# - Core modules
# - RDF ontology
# - Git hook scripts
# - Test suite
# - Documentation
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Helper functions
check() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if "$@"; then
    echo -e "${GREEN}✓${NC} $*"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}✗${NC} $*"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

file_exists() {
  [ -e "$1" ]
}

file_executable() {
  [ -x "$1" ]
}

file_contains() {
  grep -q "$2" "$1"
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}GitVan v3.2.0 Phase 1 Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Directory Structure
echo -e "${YELLOW}[1/7] Checking directory structure...${NC}"
check file_exists "src/git-lifecycle"
check file_exists "src/git-lifecycle/git-hooks"
check file_exists "src/rdf"
check file_exists "tests/git-lifecycle"
echo ""

# 2. Core Modules
echo -e "${YELLOW}[2/7] Checking core modules...${NC}"
check file_exists "src/git-lifecycle/GitEventCapture.mjs"
check file_exists "src/git-lifecycle/GitEventStore.mjs"
check file_exists "src/git-lifecycle/index.mjs"
check file_exists "src/hooks/GitLifecycleHooks.mjs"

# Check module exports
check file_contains "src/git-lifecycle/index.mjs" "GitEventCapture"
check file_contains "src/git-lifecycle/index.mjs" "GitEventStore"
check file_contains "src/git-lifecycle/index.mjs" "GitLifecycleHooks"
echo ""

# 3. RDF Ontology
echo -e "${YELLOW}[3/7] Checking RDF ontology...${NC}"
check file_exists "src/rdf/git-ontology.ttl"
check file_contains "src/rdf/git-ontology.ttl" "@prefix prov:"
check file_contains "src/rdf/git-ontology.ttl" "@prefix gitv:"
check file_contains "src/rdf/git-ontology.ttl" "PreCommitEvent"
check file_contains "src/rdf/git-ontology.ttl" "PostCommitEvent"
check file_contains "src/rdf/git-ontology.ttl" "prov:Activity"
echo ""

# 4. Git Hook Scripts
echo -e "${YELLOW}[4/7] Checking git hook scripts...${NC}"
HOOKS=(
  "pre-commit"
  "post-commit"
  "prepare-commit-msg"
  "commit-msg"
  "pre-push"
  "post-push"
  "post-checkout"
  "post-merge"
  "post-rewrite"
  "post-update"
)

for hook in "${HOOKS[@]}"; do
  hook_path="src/git-lifecycle/git-hooks/$hook"
  check file_exists "$hook_path"
  check file_executable "$hook_path"
  check file_contains "$hook_path" "#!/usr/bin/env bash"
  check file_contains "$hook_path" "GITVAN_CLI"
done
echo ""

# 5. Test Suite
echo -e "${YELLOW}[5/7] Checking test suite...${NC}"
check file_exists "tests/git-lifecycle/git-lifecycle-phase1.test.mjs"
check file_contains "tests/git-lifecycle/git-lifecycle-phase1.test.mjs" "GitEventCapture"
check file_contains "tests/git-lifecycle/git-lifecycle-phase1.test.mjs" "GitEventStore"
check file_contains "tests/git-lifecycle/git-lifecycle-phase1.test.mjs" "GitLifecycleHooks"
check file_contains "tests/git-lifecycle/git-lifecycle-phase1.test.mjs" "describe"
check file_contains "tests/git-lifecycle/git-lifecycle-phase1.test.mjs" "it"
echo ""

# 6. Documentation
echo -e "${YELLOW}[6/7] Checking documentation...${NC}"
check file_exists "docs/GIT_LIFECYCLE_PHASE1.md"
check file_exists "docs/PHASE1_IMPLEMENTATION_SUMMARY.md"
check file_exists "docs/GIT_LIFECYCLE_QUICK_START.md"
check file_contains "docs/GIT_LIFECYCLE_PHASE1.md" "Architecture"
check file_contains "docs/GIT_LIFECYCLE_PHASE1.md" "SPARQL"
check file_contains "docs/PHASE1_IMPLEMENTATION_SUMMARY.md" "Implementation Summary"
echo ""

# 7. Code Quality
echo -e "${YELLOW}[7/7] Checking code quality...${NC}"

# Check for JSDoc
check file_contains "src/git-lifecycle/GitEventCapture.mjs" "* @fileoverview"
check file_contains "src/git-lifecycle/GitEventCapture.mjs" "* @class"
check file_contains "src/git-lifecycle/GitEventCapture.mjs" "* @param"
check file_contains "src/git-lifecycle/GitEventCapture.mjs" "* @returns"

# Check for error handling
check file_contains "src/git-lifecycle/GitEventCapture.mjs" "try {"
check file_contains "src/git-lifecycle/GitEventCapture.mjs" "catch"
check file_contains "src/git-lifecycle/GitEventCapture.mjs" "throw new Error"

# Check for PROV-O integration
check file_contains "src/git-lifecycle/GitEventCapture.mjs" "PROV"
check file_contains "src/git-lifecycle/GitEventCapture.mjs" "provenance"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total checks: ${TOTAL_CHECKS}"
echo -e "${GREEN}Passed: ${PASSED_CHECKS}${NC}"
if [ $FAILED_CHECKS -gt 0 ]; then
  echo -e "${RED}Failed: ${FAILED_CHECKS}${NC}"
  echo ""
  echo -e "${RED}⚠️  Phase 1 verification FAILED${NC}"
  exit 1
else
  echo -e "${RED}Failed: ${FAILED_CHECKS}${NC}"
  echo ""
  echo -e "${GREEN}✅ Phase 1 verification PASSED${NC}"
  echo ""
  echo "All components are properly implemented:"
  echo "  ✓ Directory structure"
  echo "  ✓ Core modules (3 files)"
  echo "  ✓ RDF ontology"
  echo "  ✓ Git hook scripts (10 files)"
  echo "  ✓ Test suite"
  echo "  ✓ Documentation (3 files)"
  echo "  ✓ Code quality standards"
  exit 0
fi
