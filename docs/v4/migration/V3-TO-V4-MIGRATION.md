# Migration Guide: GitVan v3 to v4

Complete guide for upgrading from GitVan v3 to v4 with @unrdf/hooks.

---

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes](#breaking-changes)
3. [Migration Steps](#migration-steps)
4. [Pattern Translations](#pattern-translations)
5. [API Changes](#api-changes)
6. [Troubleshooting](#troubleshooting)

---

## Overview

GitVan v4 introduces the Knowledge Hook Engine, a paradigm shift from event-based hooks to predicate-based reactive automation.

### Key Changes

| v3 | v4 |
|----|-----|
| Event-driven hooks | Predicate-based hooks |
| JSON/YAML workflows | Turtle (.ttl) definitions |
| Imperative execution | Declarative predicates |
| Manual state tracking | Graph-based state |
| File-based config | RDF knowledge graph |

### Benefits of Upgrading

- **Reactive automation**: Hooks trigger on state changes, not just events
- **Queryable workflows**: SPARQL queries for workflow discovery
- **Composable definitions**: RDF allows workflow composition
- **Built-in audit trail**: Git Notes for execution history
- **Type-safe predicates**: Schema validation with SHACL

---

## Breaking Changes

### 1. Configuration Format

**v3 (JSON):**
```json
{
  "hooks": {
    "pre-commit": {
      "run": "npm run lint"
    }
  }
}
```

**v4 (Turtle):**
```turtle
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .

ex:pre-commit-hook rdf:type gh:Hook ;
    gh:hasPredicate ex:always-run ;
    gh:orderedPipelines ex:lint-pipeline .

ex:lint-pipeline rdf:type op:Pipeline ;
    op:steps (ex:run-lint) .

ex:run-lint rdf:type op:CLIStep ;
    op:command "npm run lint" .
```

### 2. Composable API

**v3:**
```javascript
import { git } from 'gitvan';

const branch = git.currentBranch();
git.commit('message');
```

**v4:**
```javascript
import { useGit } from 'gitvan/composables';

const git = useGit();
const branch = await git.branch();
await git.commit('message');
```

### 3. Hook Registration

**v3:**
```javascript
gitvan.on('pre-commit', async () => {
  await lint();
});
```

**v4:**
```bash
# Create hook definition
cat > hooks/pre-commit.ttl << 'EOF'
@prefix gh: <https://gitvan.dev/graph-hook#> .
ex:pre-commit-hook rdf:type gh:Hook .
EOF

# Install git hook
gitvan hooks install pre-commit
```

### 4. Workflow Execution

**v3:**
```javascript
await gitvan.runWorkflow('build', { target: 'production' });
```

**v4:**
```javascript
import { HookOrchestrator } from 'gitvan/hooks';

const orchestrator = new HookOrchestrator();
await orchestrator.evaluate({ category: 'build' });
```

### 5. Event Emission

**v3:**
```javascript
gitvan.emit('custom-event', { data: 'value' });
```

**v4:**
```javascript
import { useEvent } from 'gitvan/composables';

const event = useEvent();
await event.emit('custom:event', { data: 'value' });
```

---

## Migration Steps

### Step 1: Update Dependencies

```bash
npm uninstall gitvan@3
npm install gitvan@4
```

### Step 2: Create Hooks Directory

```bash
mkdir -p hooks
```

### Step 3: Convert Configuration

Create a migration script:

```javascript
// scripts/migrate-v3-to-v4.mjs
import { readFileSync, writeFileSync } from 'fs';

const v3Config = JSON.parse(readFileSync('.gitvan/config.json', 'utf8'));

function convertHookToTurtle(name, config) {
  const hookId = name.replace(/-/g, '_');

  return `
@prefix ex: <http://example.org/> .
@prefix gv: <https://gitvan.dev/ontology#> .
@prefix gh: <https://gitvan.dev/graph-hook#> .
@prefix op: <https://gitvan.dev/op#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:${hookId}-hook rdf:type gh:Hook ;
    gv:title "${name}" ;
    gh:hasPredicate ex:${hookId}-pred ;
    gh:orderedPipelines ex:${hookId}-pipeline .

ex:${hookId}-pred rdf:type gh:ASKPredicate ;
    gh:queryText "ASK WHERE { BIND(true AS ?always) }" .

ex:${hookId}-pipeline rdf:type op:Pipeline ;
    op:steps (ex:${hookId}-step) .

ex:${hookId}-step rdf:type op:CLIStep ;
    op:command "${config.run || config.command}" .
`;
}

for (const [name, config] of Object.entries(v3Config.hooks || {})) {
  const turtle = convertHookToTurtle(name, config);
  writeFileSync(`hooks/${name}.ttl`, turtle);
  console.log(`Migrated: hooks/${name}.ttl`);
}
```

Run the migration:

```bash
node scripts/migrate-v3-to-v4.mjs
```

### Step 4: Update Code References

Replace v3 imports:

```javascript
// Before (v3)
import { git, template, config } from 'gitvan';

// After (v4)
import { useGit, useTemplate } from 'gitvan/composables';
import { withGitVan } from 'gitvan/composables';
```

### Step 5: Migrate Workflows

Convert workflow files:

**v3 workflow.yaml:**
```yaml
name: build
steps:
  - name: lint
    run: npm run lint
  - name: test
    run: npm test
  - name: build
    run: npm run build
```

**v4 workflow.ttl:**
```turtle
@prefix op: <https://gitvan.dev/op#> .
@prefix gv: <https://gitvan.dev/ontology#> .

ex:build-pipeline rdf:type op:Pipeline ;
    op:steps (ex:lint ex:test ex:build) .

ex:lint rdf:type op:CLIStep ;
    gv:label "Lint" ;
    op:command "npm run lint" .

ex:test rdf:type op:CLIStep ;
    gv:label "Test" ;
    op:command "npm test" ;
    op:dependsOn ex:lint .

ex:build rdf:type op:CLIStep ;
    gv:label "Build" ;
    op:command "npm run build" ;
    op:dependsOn ex:test .
```

### Step 6: Test Migration

```bash
# Validate all hooks
gitvan hooks list

# Dry run evaluation
gitvan hooks evaluate --dry-run

# Full evaluation
gitvan hooks evaluate --verbose
```

---

## Pattern Translations

### Simple Event Hook

**v3:**
```javascript
gitvan.on('file:changed', async (event) => {
  if (event.file.endsWith('.js')) {
    await runLint(event.file);
  }
});
```

**v4:**
```turtle
ex:js-file-changed rdf:type gh:Hook ;
    gh:hasPredicate ex:js-files-changed-pred ;
    gh:orderedPipelines ex:lint-pipeline .

ex:js-files-changed-pred rdf:type gh:ResultDelta ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT ?file WHERE {
            ?file rdf:type gv:ChangedFile .
            FILTER(STRENDS(?file, ".js"))
        }
    """ .
```

### Conditional Workflow

**v3:**
```javascript
gitvan.workflow('deploy', async () => {
  const env = process.env.DEPLOY_ENV;

  if (env === 'production') {
    await backup();
    await deploy('production');
    await verify();
  } else {
    await deploy('staging');
  }
});
```

**v4:**
```turtle
ex:deploy-hook rdf:type gh:Hook ;
    gh:hasPredicate ex:deploy-trigger ;
    gh:orderedPipelines ex:deploy-pipeline .

ex:deploy-pipeline rdf:type op:Pipeline ;
    op:steps (ex:detect-env ex:prod-deploy ex:staging-deploy) .

ex:detect-env rdf:type op:CLIStep ;
    op:command "echo $DEPLOY_ENV" ;
    op:outputVar "env" .

ex:prod-deploy rdf:type op:Pipeline ;
    op:condition "{{ env == 'production' }}" ;
    op:steps (ex:backup ex:deploy-prod ex:verify) ;
    op:dependsOn ex:detect-env .

ex:staging-deploy rdf:type op:CLIStep ;
    op:command "npm run deploy:staging" ;
    op:condition "{{ env != 'production' }}" ;
    op:dependsOn ex:detect-env .
```

### Threshold Alert

**v3:**
```javascript
gitvan.on('metrics:collected', async (metrics) => {
  if (metrics.openBugs > 10) {
    await sendAlert('Too many open bugs!');
  }
});
```

**v4:**
```turtle
ex:bug-threshold-hook rdf:type gh:Hook ;
    gh:hasPredicate ex:too-many-bugs ;
    gh:orderedPipelines ex:alert-pipeline .

ex:too-many-bugs rdf:type gh:SELECTThreshold ;
    gh:queryText """
        PREFIX gv: <https://gitvan.dev/ontology#>
        SELECT (COUNT(?bug) AS ?count) WHERE {
            ?bug rdf:type gv:Bug .
            ?bug gv:status "open" .
        }
    """ ;
    gh:threshold 10 ;
    gh:operator ">" .

ex:alert-pipeline rdf:type op:Pipeline ;
    op:steps (ex:send-alert) .

ex:send-alert rdf:type op:HTTPStep ;
    op:url "https://alerts.example.com/webhook" ;
    op:method "POST" ;
    op:body """{"message": "Too many open bugs!"}""" .
```

### Scheduled Task

**v3:**
```javascript
gitvan.schedule('0 9 * * *', async () => {
  await generateReport();
  await sendReport();
});
```

**v4:**
```turtle
# In hooks/cron/daily-report.ttl
ex:daily-report-hook rdf:type gh:Hook ;
    gv:schedule "0 9 * * *" ;
    gh:hasPredicate ex:always-run ;
    gh:orderedPipelines ex:report-pipeline .

ex:always-run rdf:type gh:ASKPredicate ;
    gh:queryText "ASK WHERE { BIND(true AS ?always) }" .

ex:report-pipeline rdf:type op:Pipeline ;
    op:steps (ex:generate-report ex:send-report) .
```

---

## API Changes

### Composables

| v3 | v4 | Notes |
|----|-----|-------|
| `git.currentBranch()` | `await git.branch()` | Now async |
| `git.commit(msg)` | `await git.commit(msg)` | Now async |
| `template.render(t, d)` | `tmpl.render(t, d)` | Use useTemplate() |
| `config.get(key)` | `ctx.config[key]` | Use useGitVan() |

### CLI Commands

| v3 | v4 | Notes |
|----|-----|-------|
| `gitvan run workflow` | `gitvan workflow run` | Command restructured |
| `gitvan hook add` | `gitvan hooks create` | New syntax |
| `gitvan hook list` | `gitvan hooks list` | Plural 'hooks' |
| `gitvan config get` | Use gitvan.config.js | File-based config |

### Events

| v3 | v4 | Notes |
|----|-----|-------|
| `gitvan.on(event, fn)` | Hook with predicate | Declarative |
| `gitvan.emit(event, data)` | `event.emit(event, data)` | Use composable |
| `gitvan.once(event, fn)` | Not applicable | Use predicates |

---

## Troubleshooting

### Issue: Hooks Not Found

**Symptom:**
```
No hooks found in ./hooks directory
```

**Solution:**
1. Ensure hooks directory exists: `mkdir -p hooks`
2. Check file extensions: must be `.ttl`
3. Verify Turtle syntax is valid

### Issue: Predicate Never Triggers

**Symptom:** Hook never executes despite expected conditions.

**Solution:**
1. Test query in isolation:
   ```bash
   gitvan query "ASK WHERE { ... }"
   ```
2. Check for typos in prefixes
3. Verify graph data exists

### Issue: Context Lost in Async Code

**Symptom:**
```
Cannot call useGitVan() outside of context
```

**Solution:**
```javascript
// Wrap async code in withGitVan
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  await git.commit('message');
});
```

### Issue: Migration Script Fails

**Symptom:** Converting v3 config produces invalid Turtle.

**Solution:**
1. Validate generated Turtle:
   ```bash
   gitvan hooks validate <hook-id>
   ```
2. Check for special characters in commands
3. Escape quotes properly

### Issue: Performance Regression

**Symptom:** Hooks run slower than v3.

**Solution:**
1. Add query limits:
   ```sparql
   SELECT ?item WHERE { ... } LIMIT 100
   ```
2. Use ResultDelta instead of repeated ASK
3. Reduce hook scope with categories

---

## Migration Checklist

- [ ] Updated gitvan to v4
- [ ] Created hooks/ directory
- [ ] Converted all v3 hooks to Turtle
- [ ] Updated code to use composables
- [ ] Tested all hooks with dry-run
- [ ] Verified workflows execute correctly
- [ ] Updated CI/CD scripts
- [ ] Removed deprecated v3 files
- [ ] Updated documentation

---

## Getting Help

- [GitVan v4 Documentation](../README.md)
- [API Reference](../api/HOOK-REFERENCE.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/gitvan/gitvan/issues)
