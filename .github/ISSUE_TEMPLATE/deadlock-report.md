---
name: Deadlock / Lock Issue Report
about: Report a deadlock, lock timeout, or lock-related issue in GitVan Phase 1 RDF
title: '[LOCK] '
labels: ['bug', 'phase-1', 'lock-manager', 'deadlock']
assignees: ''
---

## Deadlock / Lock Issue Report

**Issue Type**: (select one)
- [ ] Deadlock (circular lock dependency)
- [ ] Lock timeout
- [ ] Lock not released
- [ ] Lock acquisition failure
- [ ] Other lock-related issue

## Environment

**GitVan Version**: <!-- e.g., 3.1.0 -->
**Node.js Version**: <!-- e.g., 20.10.0 -->
**OS**: <!-- e.g., Ubuntu 22.04, macOS 14.0 -->
**Git Version**: <!-- e.g., 2.43.0 -->

## Description

<!-- A clear and concise description of the lock issue -->

## Reproduction Steps

1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->

## Expected Behavior

<!-- What should have happened? -->

## Actual Behavior

<!-- What actually happened? -->

## Lock Information

**Affected Resources**:
<!-- List the resources that were locked or blocked -->
- Resource 1: `<!-- e.g., workflow:build -->`
- Resource 2: `<!-- e.g., snapshot:state -->`

**Lock Acquisition Order**:
<!-- If known, describe the order in which locks were acquired -->

```
Process A: Lock 1 → Lock 2
Process B: Lock 2 → Lock 1  (potential deadlock)
```

**Timeout Duration** (if applicable):
<!-- e.g., 30 seconds -->

## SPARQL Query Results

<!-- If you have access to the RDF store, run these queries and paste results -->

### 1. Deadlock Detection Query

```sparql
PREFIX lock: <https://gitvan.dev/lock#>

ASK WHERE {
  ?lock1 lock:blockedBy ?lock2 .
  ?lock2 lock:blockedBy+ ?lock1 .
}
```

**Result**:
```
<!-- Paste query result here -->
```

### 2. Active Locks Query

```sparql
PREFIX lock: <https://gitvan.dev/lock#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?lockId ?resourceId ?owner ?acquiredAt ?expiresAt WHERE {
  ?lock a lock:Lock ;
        lock:lockId ?lockId ;
        lock:resourceId ?resourceId ;
        lock:owner ?owner ;
        lock:acquiredAt ?acquiredAt ;
        lock:expiresAt ?expiresAt .
  FILTER(?expiresAt > NOW())
}
ORDER BY ?acquiredAt
```

**Result**:
```
<!-- Paste query result here -->
```

### 3. Blocking Chain Query

```sparql
PREFIX lock: <https://gitvan.dev/lock#>

SELECT ?lock ?blockedBy ?depth WHERE {
  ?lock lock:blockedBy* ?blockedBy .
  BIND(COUNT(?intermediate) AS ?depth)
}
ORDER BY DESC(?depth)
```

**Result**:
```
<!-- Paste query result here -->
```

## Logs

<!-- Paste relevant log output -->

```
<!-- Log output here -->
```

## Git Notes Audit Trail

<!-- If available, check Git notes for audit trail -->

```bash
git notes --ref=refs/notes/gitvan/audit show
```

**Output**:
```
<!-- Paste output here -->
```

## Lock Manager State

<!-- If possible, run: gitvan debug locks -->

```bash
gitvan debug locks
```

**Output**:
```
<!-- Paste output here -->
```

## Additional Context

<!-- Any other context about the problem -->

## Suggested Fix

<!-- If you have ideas on how to fix this, describe them here -->

## Checklist

Before submitting, please ensure:

- [ ] I have searched for existing issues
- [ ] I have included reproduction steps
- [ ] I have run SPARQL queries (if possible)
- [ ] I have included relevant logs
- [ ] I have checked the Git notes audit trail
- [ ] I have provided GitVan and Node.js versions

## Related Issues

<!-- Link to any related issues -->

Closes #
Relates to #

---

**For GitVan Maintainers**

**Priority**: <!-- Low / Medium / High / Critical -->
**Estimated Effort**: <!-- 1h / 4h / 1d / 1w -->
**Affected Modules**:
- [ ] LockManager
- [ ] RDFLockManager
- [ ] SPARQL Queries
- [ ] Git-Native I/O
- [ ] Other: ___________
