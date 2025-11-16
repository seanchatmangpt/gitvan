# GitVan Documentation: Diataxis Framework Strategy

This document outlines the complete documentation strategy for GitVan v2.2.0 using the Diataxis framework. It serves as the master plan for all documentation rewrites.

## Executive Summary

GitVan's documentation is being reorganized using **Diataxis**, the proven four-part documentation framework. This ensures users can find what they need exactly when they need it.

### The Four Pillars

| Pillar | Purpose | User Mindset | Example |
|--------|---------|--------------|---------|
| **Tutorials** | **Learning by doing** | "Show me how to get started" | "Your First GitVan Job" |
| **How-To Guides** | **Solving real problems** | "I have a problem, show me the solution" | "How to Migrate from GitHub Actions" |
| **Reference** | **Finding information** | "I need to know the exact syntax" | "CLI Commands Reference" |
| **Explanations** | **Understanding concepts** | "Why does this work this way?" | "Git-Native Automation Philosophy" |

---

## Documentation Map

### 📚 Tutorials (Learning-Oriented)
**Goal:** Build confidence through hands-on success

**Documents:**
1. `getting-started.md` - Installation and first steps
2. `tutorials/index.md` - Tutorial collection hub
3. `tutorials/tutorial-first-job.md` - Create your first job
4. `tutorials/tutorial-first-hook.md` - Create your first hook
5. `tutorials/tutorial-first-pack.md` - Create your first pack
6. `tutorials/tutorial-first-test.md` - Test your first automation
7. `bdd/london-bdd-implementation.md` - BDD testing tutorial
8. `examples/composables-examples.md` - Hands-on composables examples
9. `playground/README.md` - Interactive playground guide

**Philosophy:**
- Narrative, friendly, encouraging
- Concrete tasks with visible results
- No distractions or edge cases
- End with "What's next?" links

---

### 🔧 How-To Guides (Problem-Oriented)
**Goal:** Solve specific, practical problems

**Documents:**
1. `migration/from-github-actions.md` - Migrate from GitHub Actions
2. `migration/from-husky.md` - Migrate from Husky
3. `guides/pack-authoring.md` - Create and publish packs
4. `guides/plugin-development.md` - Develop plugins
5. `guides/security-implementation.md` - Implement security policies
6. `guides/performance-tuning.md` - Tune for performance
7. `testing-gitvan/how-to-debug-tests.md` - Debug failing tests
8. `testing-gitvan/how-to-test-locally.md` - Test in development
9. `testing-gitvan/how-to-test-ci-cd.md` - Test in CI/CD
10. `cookbook/` - 20+ recipes for common tasks

**Philosophy:**
- Direct, assumption-laden, task-focused
- "When you want X, do this"
- Solution first, explanation second
- Link to concepts but don't digress

---

### 📖 Reference (Information-Oriented)
**Goal:** Answer specific technical questions quickly

**Documents:**
1. `cli/commands-reference.md` - All CLI commands
2. `cli/command-examples.md` - CLI command examples
3. `composables/api-reference.md` - Composables API
4. `composables/api-examples.md` - Composables examples
5. `api/git-api-reference.md` - Git API reference
6. `api/hooks-reference.md` - Hook predicates reference
7. `api/events-reference.md` - Events system reference
8. `api/jobs-reference.md` - Job definition reference
9. `reference/configuration-reference.md` - Configuration options
10. `reference/environment-variables.md` - Environment variables
11. `validation/autonomic-patterns-reference.md` - Autonomic patterns

**Philosophy:**
- Structured for quick lookup (alphabetical, organized by category)
- Syntax-focused, minimal explanation
- Examples provided but secondary
- Cross-reference to how-to guides

---

### 💭 Explanations (Understanding-Oriented)
**Goal:** Build mental models and understand design decisions

**Documents:**
1. `architecture/git-native-philosophy.md` - Why Git-native?
2. `architecture/system-architecture.md` - System overview
3. `architecture/workflow-engine.md` - How workflows work
4. `architecture/knowledge-hooks.md` - How hooks work
5. `architecture/pack-system.md` - Why packs?
6. `architecture/configuration-system.md` - Why configuration matters
7. `reference/why-diataxis.md` - Why we structure docs this way
8. `security/threat-models.md` - Security concepts
9. `performance/performance-principles.md` - Performance philosophy
10. `plugins/plugin-architecture.md` - Plugin system design

**Philosophy:**
- Discursive, exploratory, conceptual
- Start with "why", then "how"
- No page limit—depth is good
- Reference to implementations but don't be prescriptive

---

## Cross-Linking Strategy

### Link Types

**Progression Links** (Tutorial → How-To)
```
"Now that you understand the basics, check out: How to Create Advanced Jobs"
```

**Reference Links** (How-To → Reference)
```
"For detailed CLI syntax, see: CLI Commands Reference"
```

**Context Links** (Reference → Explanation)
```
"Why this configuration? See: Why Configuration Matters"
```

**Alternative Links** (How-To → How-To)
```
"If you prefer approach B, see: How to Use Composables Instead"
```

### Reverse Links

Each document category should link back to INDEX.md with clear navigation:
- "← Back to Documentation Hub"
- "Browse other [category] documents"
- "Jump to [related category]"

---

## Writing Standards

### Tone & Voice

| Category | Tone | Voice |
|----------|------|-------|
| **Tutorials** | Encouraging, friendly | "We", "Let's", "Together" |
| **How-To** | Direct, confident | "Do this", "Then that" |
| **Reference** | Neutral, precise | "This does X", "Syntax is:" |
| **Explanation** | Thoughtful, exploratory | "Consider", "It's important because" |

### Document Structure

**Tutorials:**
```
# Tutorial Title

[One sentence summary]

## What You'll Build
[What they'll accomplish]

## Prerequisites
[What they need to know]

## Step 1: [Concrete Task]
[Instructions with code examples]

## Step 2: [Next Task]
[Instructions with results]

## Success! What's Next?
[Links to related tutorials/guides]
```

**How-To Guides:**
```
# How to [Achieve Goal] [When Context]

[One paragraph: problem statement]

## Prerequisites
[What to know before starting]

## Solution
[Step-by-step solution]

## Troubleshooting
[Common issues & fixes]

## Related Guides
[Links to alternative approaches]
```

**Reference:**
```
# [Topic] Reference

[One paragraph: what this covers]

## Contents
[Organized list/index]

## [Subtopic 1]
[Syntax, parameters, examples]

## [Subtopic 2]
[Syntax, parameters, examples]

## See Also
[Links to related references/explanations]
```

**Explanations:**
```
# [Concept]: [Aspect to Explain]

[Opening: why this matters]

## The Problem This Solves
[Context and motivation]

## How It Works
[Conceptual explanation]

## Design Decisions
[Why we chose this approach]

## When to Use This
[Scope and limitations]

## Related Concepts
[Links to other explanations]
```

---

## Page Organization Principles

### 1. Progressive Disclosure
- Start simple, build complexity
- Hide advanced options initially
- Use collapsible sections for edge cases

### 2. Scannability
- Clear headings (H2, H3 hierarchy)
- Bullet lists for choices
- Code blocks for examples
- Tables for comparisons

### 3. Actionability
- Clear calls-to-action
- Next steps at bottom
- Links to related content
- "Copy-paste ready" code

### 4. Consistency
- Same structure within category
- Same terminology throughout
- Same formatting conventions
- Same cross-link style

---

## Document Inventory & Status

### Tutorials (9 documents)
- [ ] `getting-started.md` - **Rewrite**
- [ ] `tutorials/index.md` - **Enhance**
- [ ] `tutorials/tutorial-first-job.md` - **New**
- [ ] `tutorials/tutorial-first-hook.md` - **New**
- [ ] `tutorials/tutorial-first-pack.md` - **New**
- [ ] `tutorials/tutorial-first-test.md` - **New**
- [ ] `bdd/london-bdd-implementation.md` - **Reposition**
- [ ] `examples/composables-examples.md` - **Extract**
- [ ] `playground/README.md` - **Link**

### How-To Guides (10+ documents)
- [ ] `migration/from-github-actions.md` - **Rewrite**
- [ ] `migration/from-husky.md` - **Rewrite**
- [ ] `guides/pack-authoring.md` - **Rewrite**
- [ ] `guides/plugin-development.md` - **New**
- [ ] `guides/security-implementation.md` - **Extract**
- [ ] `guides/performance-tuning.md` - **Extract**
- [ ] `testing-gitvan/how-to-*.md` - **New (3 files)**
- [ ] `cookbook/` - **Enhance & Link**
- [ ] `cookbook/recipes/` - **20+ recipes**

### Reference (11 documents)
- [ ] `cli/commands-reference.md` - **Reorganize**
- [ ] `cli/command-examples.md` - **New**
- [ ] `composables/api-reference.md` - **Reorganize**
- [ ] `composables/api-examples.md` - **New**
- [ ] `api/git-api-reference.md` - **Consolidate**
- [ ] `api/hooks-reference.md` - **Extract**
- [ ] `api/events-reference.md` - **Extract**
- [ ] `api/jobs-reference.md` - **Extract**
- [ ] `reference/configuration-reference.md` - **Reorganize**
- [ ] `reference/environment-variables.md` - **Extract**
- [ ] `validation/autonomic-patterns-reference.md` - **Extract**

### Explanations (10 documents)
- [ ] `architecture/git-native-philosophy.md` - **New**
- [ ] `architecture/system-architecture.md` - **Rewrite**
- [ ] `architecture/workflow-engine.md` - **Extract**
- [ ] `architecture/knowledge-hooks.md` - **Extract**
- [ ] `architecture/pack-system.md` - **Extract**
- [ ] `architecture/configuration-system.md` - **Extract**
- [ ] `reference/why-diataxis.md` - **New**
- [ ] `security/threat-models.md` - **Extract**
- [ ] `performance/performance-principles.md` - **Extract**
- [ ] `plugins/plugin-architecture.md` - **Extract**

### Integration
- [ ] `docs/INDEX.md` - **Enhance & Link**
- [ ] `README.md` - **Rewrite (80/20)**

---

## Quality Checklist

Every document must pass:

### Content Quality
- [ ] Solves a real user problem
- [ ] Clear and concise
- [ ] Accurate and up-to-date
- [ ] Includes working code examples
- [ ] No unnecessary jargon

### Structure Quality
- [ ] Follows Diataxis category structure
- [ ] Clear headings and sections
- [ ] Progressive difficulty level
- [ ] Proper use of formatting (bold, code, lists)
- [ ] Good scanability

### Cross-Linking Quality
- [ ] Links to related documents
- [ ] Links back to INDEX.md
- [ ] Proper link context (why you'd want to follow)
- [ ] No broken links
- [ ] Consistent link text

### Diataxis Compliance
- [ ] Right category for content
- [ ] Right tone for category
- [ ] Right level of detail
- [ ] Right amount of examples
- [ ] Avoids mixing categories

---

## Implementation Plan

### Phase 1: Strategy & Foundations (This document)
- [x] Create master strategy document
- [ ] Item 1 complete

### Phase 2: Tutorials (Learning-Oriented)
- [ ] Item 2: Rewrite tutorials hub
- [ ] Commit after completion

### Phase 3: How-To Guides (Problem-Oriented)
- [ ] Item 3: Rewrite migration guides
- [ ] Item 9: Rewrite cookbook
- [ ] Item 10: Rewrite testing how-tos
- [ ] Item 11: Rewrite plugin how-tos
- [ ] Commits after each

### Phase 4: Reference (Information-Oriented)
- [ ] Item 4: Rewrite CLI reference
- [ ] Item 5: Rewrite composables reference
- [ ] Commits after each

### Phase 5: Explanations (Understanding-Oriented)
- [ ] Item 6: Rewrite architecture explanations
- [ ] Item 7: Rewrite security explanations
- [ ] Item 8: Rewrite performance explanations
- [ ] Commits after each

### Phase 6: Configuration & Integration
- [ ] Item 13: Rewrite configuration guides
- [ ] Item 12: Rewrite pack authoring
- [ ] Item 14: Cross-linking & enhancement
- [ ] Item 15: Rewrite root README
- [ ] Final commits

---

## Success Metrics

By end of rewrite:
- ✅ Users can find what they need in < 1 minute
- ✅ New users can get started in < 5 minutes
- ✅ Each document has a single, clear purpose
- ✅ No mixing of Diataxis categories
- ✅ Consistent tone and structure
- ✅ Clear progression paths (Tutorial → How-To → Reference)
- ✅ All documents cross-linked appropriately
- ✅ INDEX.md serves as effective navigation hub

---

## Notes for Authors

- **Don't mix categories:** A document is EITHER tutorial OR how-to OR reference OR explanation, not multiple
- **Assume appropriate knowledge:** Tutorials assume no knowledge. References assume the user knows what they're looking for.
- **Be goal-focused:** Each document solves a specific problem or teaches a specific skill
- **Link generously:** Users should be able to navigate between related documents easily
- **Use examples:** Every concept needs a concrete example users can copy and run
- **Test locally:** Every code example should be tested and work as written

---

**Master Plan Status:** ✅ Complete

**Next:** Item 2 - Rewrite Tutorials Hub
