# Knowledge Hooks

This directory contains Knowledge Hook definitions that demonstrate intelligent automation based on changes in your project's knowledge graph.

## Available Hooks

- `version-change.ttl` - Detects project version changes
- `critical-issues.ttl` - Monitors for critical issues

## Usage

```bash
# List available hooks
gitvan hooks list

# Evaluate all hooks
gitvan hooks evaluate

# Validate a specific hook
gitvan hooks validate version-change-hook
```

## Creating New Hooks

1. Create a new `.ttl` file in this directory
2. Define your hook using the GitVan ontology
3. Test with `gitvan hooks validate <hook-name>`
4. Run evaluation with `gitvan hooks evaluate`

## Hook Types

- **ResultDelta** - Detects changes in query results between commits
- **ASK** - Evaluates boolean conditions
- **SELECTThreshold** - Monitors numerical values against thresholds
- **SHACL** - Validates graph conformance against shapes
