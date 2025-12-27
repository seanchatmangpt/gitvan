# GitVan v4 Troubleshooting Guide

Solutions for common issues and problems.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Hook Issues](#hook-issues)
3. [Predicate Issues](#predicate-issues)
4. [Workflow Issues](#workflow-issues)
5. [Performance Issues](#performance-issues)
6. [Context Issues](#context-issues)
7. [Graph Issues](#graph-issues)

---

## Installation Issues

### npm install fails

**Symptom:**
```
npm ERR! peer dep missing: node@>=18
```

**Solution:**
Update Node.js to version 18 or higher:
```bash
nvm install 18
nvm use 18
```

### gitvan command not found

**Symptom:**
```
bash: gitvan: command not found
```

**Solution:**
1. Ensure global installation:
   ```bash
   npm install -g gitvan
   ```

2. Check npm global bin path:
   ```bash
   npm bin -g
   ```

3. Add to PATH if needed:
   ```bash
   export PATH="$(npm bin -g):$PATH"
   ```

### Permission denied

**Symptom:**
```
EACCES: permission denied
```

**Solution:**
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g gitvan
```

---

## Hook Issues

### Hooks not found

**Symptom:**
```
No hooks found in ./hooks directory
```

**Solutions:**

1. Create hooks directory:
   ```bash
   mkdir -p hooks
   ```

2. Ensure files have `.ttl` extension:
   ```bash
   ls hooks/*.ttl
   ```

3. Check working directory:
   ```bash
   pwd
   gitvan hooks list
   ```

### Hook never triggers

**Symptom:** Hook exists but never executes.

**Solutions:**

1. Verify predicate manually:
   ```bash
   # Test query directly
   gitvan query "ASK WHERE { ?s ?p ?o }"
   ```

2. Check for typos in prefixes:
   ```turtle
   # Correct
   @prefix gv: <https://gitvan.dev/ontology#> .

   # Wrong
   @prefix gv: <http://gitvan.dev/ontology#> .  # http vs https
   ```

3. Use verbose mode:
   ```bash
   gitvan hooks evaluate --verbose
   ```

### Invalid Turtle syntax

**Symptom:**
```
Error: Unexpected token at line X
```

**Solutions:**

1. Validate Turtle file:
   ```bash
   gitvan hooks validate my-hook
   ```

2. Common syntax errors:
   ```turtle
   # Missing period
   ex:hook rdf:type gh:Hook     # Wrong
   ex:hook rdf:type gh:Hook .   # Correct

   # Missing prefix declaration
   ex:hook rdf:type gh:Hook .   # Wrong if ex: not declared

   # Unclosed string
   gh:queryText "SELECT ..." ;  # Wrong
   gh:queryText """SELECT ...""" . # Correct for multi-line
   ```

### Hook validation fails

**Symptom:**
```
Hook validation failed: Predicate not found
```

**Solutions:**

1. Ensure predicate is linked:
   ```turtle
   ex:my-hook rdf:type gh:Hook ;
       gh:hasPredicate ex:my-predicate .  # Required link

   ex:my-predicate rdf:type gh:ASKPredicate ;
       gh:queryText "..." .
   ```

2. Check predicate type:
   ```turtle
   # Valid types
   gh:ASKPredicate
   gh:ResultDelta
   gh:SELECTThreshold
   gh:SHACLAllConform
   ```

---

## Predicate Issues

### SPARQL query error

**Symptom:**
```
Error: SPARQL parse error at line X
```

**Solutions:**

1. Check query syntax:
   ```sparql
   # Wrong - missing WHERE
   SELECT ?x { ?x ?y ?z }

   # Correct
   SELECT ?x WHERE { ?x ?y ?z }
   ```

2. Escape special characters:
   ```turtle
   gh:queryText """
       SELECT ?item WHERE {
           ?item gv:name "Test\\"s" .  # Escaped quote
       }
   """ .
   ```

3. Use proper prefixes in query:
   ```sparql
   PREFIX gv: <https://gitvan.dev/ontology#>
   SELECT ?item WHERE { ?item rdf:type gv:Bug }
   ```

### ResultDelta always triggers

**Symptom:** Hook triggers on every evaluation.

**Solutions:**

1. Add ORDER BY for consistent results:
   ```sparql
   SELECT ?item WHERE {
       ?item rdf:type gv:Task .
   } ORDER BY ?item  # Ensures stable ordering
   ```

2. Exclude volatile data:
   ```sparql
   SELECT ?item WHERE {
       ?item rdf:type gv:Task .
       FILTER(!CONTAINS(str(?item), "temp"))
   }
   ```

### Threshold not triggering

**Symptom:** SELECTThreshold never fires.

**Solutions:**

1. Verify query returns numeric:
   ```sparql
   # Must return COUNT, SUM, AVG, etc.
   SELECT (COUNT(?bug) AS ?count) WHERE { ... }
   ```

2. Check operator direction:
   ```turtle
   # Triggers when count > 10
   gh:threshold 10 ;
   gh:operator ">" .

   # Triggers when count < 10
   gh:threshold 10 ;
   gh:operator "<" .
   ```

3. Debug query result:
   ```bash
   gitvan query "SELECT (COUNT(?bug) AS ?count) WHERE { ?bug rdf:type gv:Bug }"
   ```

---

## Workflow Issues

### Step timeout

**Symptom:**
```
Error: Step execution timed out after 60000ms
```

**Solutions:**

1. Increase timeout:
   ```turtle
   ex:long-step rdf:type op:CLIStep ;
       op:command "npm test" ;
       op:timeout 300000 .  # 5 minutes
   ```

2. Break into smaller steps:
   ```turtle
   ex:pipeline rdf:type op:Pipeline ;
       op:steps (ex:step1 ex:step2 ex:step3) .  # Split work
   ```

### Step dependency error

**Symptom:**
```
Error: Dependency step1 not found
```

**Solutions:**

1. Verify step ID matches:
   ```turtle
   ex:step2 rdf:type op:CLIStep ;
       op:dependsOn ex:step1 .  # Must match exactly

   ex:step1 rdf:type op:CLIStep ;  # This is step1
       op:command "..." .
   ```

2. Check for circular dependencies:
   ```turtle
   # Wrong - circular
   ex:step1 op:dependsOn ex:step2 .
   ex:step2 op:dependsOn ex:step1 .

   # Correct
   ex:step1 .  # No dependency
   ex:step2 op:dependsOn ex:step1 .
   ```

### Command not found in step

**Symptom:**
```
Error: Command 'xyz' not found
```

**Solutions:**

1. Use full path:
   ```turtle
   op:command "/usr/local/bin/npm run build" .
   ```

2. Ensure command is available in PATH:
   ```bash
   which npm  # Verify command exists
   ```

3. Set environment in context:
   ```javascript
   await withGitVan({
     env: { PATH: process.env.PATH }
   }, async () => {
     await orchestrator.evaluate();
   });
   ```

---

## Performance Issues

### Slow hook evaluation

**Symptom:** Hooks take too long to evaluate.

**Solutions:**

1. Add query limits:
   ```sparql
   SELECT ?item WHERE { ... } LIMIT 100
   ```

2. Use more specific queries:
   ```sparql
   # Slow - scans all triples
   SELECT ?s WHERE { ?s ?p ?o }

   # Fast - uses type index
   SELECT ?bug WHERE { ?bug rdf:type gv:Bug }
   ```

3. Enable lazy loading:
   ```javascript
   const orchestrator = new HookOrchestrator({
     lazyLoad: true
   });
   ```

### Memory issues

**Symptom:**
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
```

**Solutions:**

1. Increase Node.js memory:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" gitvan hooks evaluate
   ```

2. Reduce graph size:
   - Split large `.ttl` files
   - Archive old data

3. Process in batches:
   ```bash
   gitvan hooks evaluate-category batch1
   gitvan hooks evaluate-category batch2
   ```

### Slow CLI startup

**Symptom:** CLI takes seconds to start.

**Solutions:**

1. Check for large graphs:
   ```bash
   find hooks -name "*.ttl" -exec wc -l {} \; | sort -n
   ```

2. Remove unused hooks:
   ```bash
   # Archive old hooks
   mv hooks/old-* hooks/archive/
   ```

---

## Context Issues

### Context not available

**Symptom:**
```
Error: Cannot call useGitVan() outside of context
```

**Solutions:**

1. Wrap in withGitVan:
   ```javascript
   // Wrong
   const git = useGit();  // Error!

   // Correct
   await withGitVan({ cwd: process.cwd() }, async () => {
     const git = useGit();  // Works
   });
   ```

2. Use tryUseGitVan for optional context:
   ```javascript
   import { tryUseGitVan } from 'gitvan/composables';

   const ctx = tryUseGitVan();  // Returns null if no context
   ```

### Context lost after await

**Symptom:** Context undefined after async call.

**Solutions:**

1. Capture context before await:
   ```javascript
   await withGitVan(ctx, async () => {
     const git = useGit();  // Capture before await
     const branch = await git.branch();
     // git still valid here
   });
   ```

2. Avoid nested async calls:
   ```javascript
   // Wrong
   await withGitVan(ctx, async () => {
     await someAsync();
     const git = useGit();  // May fail
   });

   // Correct
   await withGitVan(ctx, async () => {
     const git = useGit();
     await someAsync();
     await git.commit('msg');  // Works
   });
   ```

---

## Graph Issues

### Graph not loading

**Symptom:**
```
Error: Failed to load graph from ./hooks
```

**Solutions:**

1. Check directory exists:
   ```bash
   ls -la hooks/
   ```

2. Verify file permissions:
   ```bash
   chmod 644 hooks/*.ttl
   ```

3. Check for encoding issues:
   ```bash
   file hooks/*.ttl  # Should show UTF-8
   ```

### Query returns empty

**Symptom:** Query should return data but returns empty.

**Solutions:**

1. Verify data is loaded:
   ```bash
   gitvan query "SELECT * WHERE { ?s ?p ?o } LIMIT 10"
   ```

2. Check prefix URIs match:
   ```sparql
   # If data uses http://
   SELECT ?bug WHERE {
       ?bug <http://example.org/type> "Bug" .
   }

   # Won't match if query uses https://
   PREFIX ex: <https://example.org/>  # Wrong protocol
   ```

3. Debug with verbose:
   ```bash
   gitvan query --verbose "SELECT ?bug WHERE { ... }"
   ```

### Duplicate triples

**Symptom:** Same data appears multiple times.

**Solutions:**

1. Use DISTINCT:
   ```sparql
   SELECT DISTINCT ?item WHERE { ... }
   ```

2. Check for duplicate files:
   ```bash
   md5sum hooks/*.ttl | sort
   ```

---

## Getting Help

If you cannot resolve your issue:

1. **Search Issues**: [GitHub Issues](https://github.com/gitvan/gitvan/issues)

2. **Create Issue** with:
   - GitVan version: `gitvan --version`
   - Node.js version: `node --version`
   - OS: `uname -a`
   - Error message (full)
   - Minimal reproduction

3. **Community**: [Discussions](https://github.com/gitvan/gitvan/discussions)

---

## Quick Diagnostic Commands

```bash
# Version info
gitvan --version
node --version

# Validate all hooks
for hook in $(gitvan hooks list --json | jq -r '.[].id'); do
  gitvan hooks validate $hook
done

# Test graph loading
gitvan query "ASK WHERE { ?s ?p ?o }"

# Verbose evaluation
gitvan hooks evaluate --verbose --dry-run

# Check hook stats
gitvan hooks stats
```
