---
name: Pack Compatibility Issue
about: Report pack compatibility issues (version conflicts, dependency resolution, license conflicts)
title: '[Pack] Compatibility issue with [PACK_NAME]'
labels: pack-system, phase-4, compatibility
assignees: ''
---

## Issue Type

<!-- Select one or more -->
- [ ] Version Conflict
- [ ] Dependency Resolution Failure
- [ ] License Incompatibility
- [ ] Circular Dependency
- [ ] Missing Dependency
- [ ] Pack Not Found
- [ ] Other Compatibility Issue

## Affected Packs

**Primary Pack:**
- Name:
- Version:
- License:

**Conflicting Pack(s):**
- Name:
- Version:
- License:

## RDF Representation

<!-- Provide RDF representation of affected packs -->
```turtle
@prefix pack: <https://gitvan.dev/pack#> .

:pack-1 a pack:Pack ;
  pack:name "example-pack" ;
  pack:version "1.0.0" ;
  pack:license "MIT" ;
  pack:dependsOn :pack-2 .

:pack-2 a pack:Pack ;
  pack:name "dependency-pack" ;
  pack:version "2.0.0" ;
  pack:license "Apache-2.0" .
```

## Version Conflict Details (if applicable)

**Package Name:**
**Required Version(s):**
- Pack A requires: <!-- e.g., ^1.0.0 -->
- Pack B requires: <!-- e.g., ^2.0.0 -->

**Resolution Status:** <!-- Could not resolve, Manual intervention required, etc. -->

## Dependency Graph

<!-- If possible, provide dependency graph -->
```
pack-a@1.0.0
├── dependency-x@^1.0.0
│   └── sub-dep@^2.0.0
└── dependency-y@^2.0.0
    └── sub-dep@^1.5.0  ← CONFLICT!
```

## SPARQL Query for Resolution

<!-- SPARQL query attempted -->
```sparql
SELECT ?pack ?version WHERE {
  ?pack pack:name "example-pack" ;
        pack:version ?version ;
        pack:compatibility-range "^1.0.0" .
  FILTER(?version >= "1.0.0" && ?version < "2.0.0")
}
```

## License Compatibility Details (if applicable)

**Project License:**
**Pack License:**
**Compatible:** <!-- Yes/No -->

**License Compatibility Matrix:**
| Pack | License | Compatible with Project License? |
|------|---------|-----------------------------------|
| pack-1 | MIT | ✓ Yes |
| pack-2 | GPL-3.0 | ✗ No |

**Compliance Issue:** <!-- Describe the license compliance concern -->

## Circular Dependency Details (if applicable)

**Dependency Cycle Detected:**
```
pack-a → pack-b → pack-c → pack-a
```

**N3 Rule Applied:** <!-- Which cycle detection rule was triggered? -->

## Federated Discovery Details (if applicable)

**Remote Registry:** <!-- URL of remote registry -->
**Query Used:**
**Results:** <!-- What was found/not found -->

## Expected Behavior

<!-- What should happen? -->

## Actual Behavior

<!-- What actually happens? -->

## Steps to Reproduce

1. Install pack: `gitvan pack install [PACK_NAME]`
2. Attempt to resolve dependencies
3. Observe error: [ERROR_MESSAGE]

## Error Message

```
[Paste full error message]
```

## Dependency Resolution Output

```bash
$ gitvan pack resolve
[Paste output]
```

## Semantic Search Query (if used)

<!-- If searching for compatible packs -->
```sparql

```

## Environment

- **Node Version:**
- **GitVan Version:**
- **Pack Registry:** <!-- Local, Remote, Federated -->
- **Total Packs Installed:**

## Performance Impact

<!-- If resolution is slow -->
**Resolution Time:** <!-- e.g., 5000ms -->
**Performance Target:** <!-- e.g., < 500ms -->
**Graph Size:** <!-- Number of packs in dependency graph -->

## Workaround

<!-- Is there a temporary workaround? -->

## Suggested Solution

<!-- How might this be resolved? -->
- [ ] Update pack version constraints
- [ ] Remove conflicting dependency
- [ ] Use different pack
- [ ] Update license
- [ ] Break circular dependency
- [ ] Other: <!-- Please describe -->

## Pack Composition

<!-- If trying to compose multiple packs -->
**Desired Packs:**
-
-
-

**Composition Result:** <!-- Success, Conflicts detected, etc. -->

## Compatibility Matrix

<!-- If available, show compatibility matrix -->
|  | Pack A | Pack B | Pack C |
|--|--------|--------|--------|
| **Pack A** | ✓ | ✓ | ✗ |
| **Pack B** | ✓ | ✓ | ✓ |
| **Pack C** | ✗ | ✓ | ✓ |

## Auto-Suggestion Results

<!-- If using auto-suggestion feature -->
**Category:**
**Constraints:**
**Suggested Packs:**
-

## N3 Rules Applied

<!-- Which N3 rules were evaluated? -->
- [ ] Dependency cycle detection
- [ ] Version constraint validation
- [ ] License conflict detection
- [ ] Compatibility validation
- [ ] Other: <!-- Please describe -->

## Additional Context

<!-- Any other relevant information -->

## Related Issues

<!-- Link to related pack compatibility issues -->

## Pack Registry Links

<!-- Links to pack in registry/marketplace -->
- Primary Pack:
- Conflicting Pack:

---

**Registry Query Results:**
<!-- Attach SPARQL query results if helpful -->
