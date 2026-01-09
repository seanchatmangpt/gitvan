# Phase 2 Week 1 - Setup Instructions

## Prerequisites

Before running Phase 2 Week 1 components, ensure the GitVan development environment is properly set up.

## Quick Setup

```bash
# Initialize UnRDF submodule and build dependencies
npm run setup-dev

# Verify installation
node scripts/verify-phase2-week1.mjs
```

## Manual Setup

If you prefer manual setup:

```bash
# 1. Initialize git submodules
git submodule update --init --recursive

# 2. Install dependencies
npm install

# 3. Build UnRDF submodule
npm run build:unrdf

# 4. Build GitVan
npm run build

# 5. Verify Phase 2 Week 1
node scripts/verify-phase2-week1.mjs
```

## Running the Example

```bash
# After setup is complete:
node examples/performance-monitoring-example.mjs
```

Expected output:
- 50 SPARQL queries recorded
- 30 Git commits recorded
- 20 Workflow executions recorded
- Anomaly detection results
- Statistics analysis
- Correlation discovery
- Trend analysis

## Running Tests

```bash
npm test tests/performance/RDFPerformanceMonitor.test.mjs
```

Expected: All 34 tests passing

## Troubleshooting

### Error: Cannot find module 'vendor/unrdf/...'

**Cause:** UnRDF submodule not initialized

**Fix:**
```bash
git submodule update --init --recursive
npm run build:unrdf
```

### Error: parseTurtle is not a function

**Cause:** UnRDF not built

**Fix:**
```bash
npm run build:unrdf
```

### Error: Cannot create KnowledgeSubstrateCore

**Cause:** UnRDF dependencies not installed

**Fix:**
```bash
cd vendor/unrdf
npm install
npm run build
cd ../..
```

## Verification Checklist

- [ ] Git submodules initialized (`vendor/unrdf` exists)
- [ ] UnRDF built (`vendor/unrdf/packages/core/dist` exists)
- [ ] GitVan dependencies installed (`node_modules` exists)
- [ ] Verification script passes (`node scripts/verify-phase2-week1.mjs`)
- [ ] Example runs successfully
- [ ] Tests pass

## Files Delivered

All files should exist and have the expected line counts:

```
✅ src/rdf/ontologies/performance-ontology.ttl     (596 lines)
✅ src/performance/RDFPerformanceMonitor.mjs       (816 lines)
✅ src/performance/sparql-queries.mjs              (511 lines)
✅ examples/performance-monitoring-example.mjs     (402 lines)
✅ tests/performance/RDFPerformanceMonitor.test.mjs (542 lines)
✅ docs/PHASE-2-WEEK-1-PERFORMANCE-ONTOLOGY.md     (658 lines)
```

Total: **3,525 lines** delivered

## Integration with Existing GitVan

Phase 2 Week 1 components integrate seamlessly with existing GitVan infrastructure:

### With Workflow Engine
```javascript
import { WorkflowEngine } from "gitvan/workflow/workflow-engine";
import { RDFPerformanceMonitor } from "gitvan/performance/RDFPerformanceMonitor";

const monitor = new RDFPerformanceMonitor();
await monitor.initialize(workflowEngine.core); // Share substrate
```

### With Git Operations
```javascript
import { useGit } from "gitvan/composables/git";
import { RDFPerformanceMonitor } from "gitvan/performance/RDFPerformanceMonitor";

const git = useGit();
const monitor = new RDFPerformanceMonitor();
await monitor.initialize();

// Track git operations
const start = performance.now();
await git.commit("message");
await monitor.recordMeasurement("git-commit", performance.now() - start);
```

## Documentation

Complete documentation available at:
- **Implementation Guide:** `docs/PHASE-2-WEEK-1-PERFORMANCE-ONTOLOGY.md`
- **Setup Instructions:** `docs/PHASE-2-WEEK-1-SETUP.md` (this file)
- **Summary:** `IMPLEMENTATION_SUMMARY_PHASE2_WEEK1.md`

## Next Steps

Once setup is complete and verification passes:

1. ✅ Review the ontology: `src/rdf/ontologies/performance-ontology.ttl`
2. ✅ Study the monitor: `src/performance/RDFPerformanceMonitor.mjs`
3. ✅ Run the example: `node examples/performance-monitoring-example.mjs`
4. ✅ Run tests: `npm test tests/performance/`
5. ✅ Read documentation: `docs/PHASE-2-WEEK-1-PERFORMANCE-ONTOLOGY.md`

Then proceed to **Phase 2 Week 2: Real-Time Integration**

## Support

For issues or questions:
1. Check CLAUDE.md for GitVan development guidelines
2. Review UNRDF-PACKAGES-SURVEY.md for context
3. See Submodule Setup Guide: `docs/SUBMODULE_SETUP.md`

---

**Last Updated:** January 9, 2026
**GitVan Version:** 3.0.0+
