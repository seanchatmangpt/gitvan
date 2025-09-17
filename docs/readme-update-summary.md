# GitVan README Updated - Unified Hooks System

## 🎯 README Updates Summary

The GitVan README has been successfully updated to reflect the **unified hooks system** architecture:

### ✅ **Key Changes Made**

1. **Title & Description**
   - Updated to emphasize "unified hooks system"
   - Reflects single execution mechanism

2. **Quick Start Example**
   - Replaced `on: { tagCreate: "v*" }` with `hooks: ["post-commit", "post-merge"]`
   - Updated example to use `gitvan hook post-commit` instead of event simulation
   - Shows unified hooks system in action

3. **Composables API**
   - Changed "Job & Event Composables" to "Job & Hook Composables"
   - Updated `useEvent` to `useHook` for unified hooks system
   - Updated registry description to "Job and hook registry management"

4. **API Reference**
   - Updated `defineJob` examples to use `hooks: [...]` instead of `on: { ... }`
   - Replaced "Event Schema" with "Hooks Schema"
   - Shows supported hooks: post-commit, post-merge, post-rewrite, pre-push

5. **New Unified Hooks System Section**
   - Added comprehensive section explaining the unified system
   - Benefits: cleaner architecture, deterministic execution, better separation
   - Git hook integration commands
   - Single execution mechanism explanation

6. **Core Capabilities**
   - Added "Unified Hooks System" as core capability
   - Updated "Job System" to "hook-based scheduling"

7. **CLI Commands**
   - Added "Unified Hooks System" command section
   - New commands: `gitvan hook <name>`, `gitvan event simulate --files`
   - Updated "Daemon & Events" to "Daemon & Hooks"
   - Added manual hook execution commands

8. **Project Structure**
   - Added `src/hooks/` directory with router hooks
   - Added `_shared/` utilities directory
   - Removed `events/` directory
   - Updated job definitions description

### ✅ **Architecture Benefits Highlighted**

- **Single System**: One execution mechanism instead of events + jobs
- **Cleaner Definitions**: `hooks: [...]` instead of complex event matching
- **Deterministic Execution**: Filename prefix ordering
- **Better Separation**: Clear responsibilities
- **Easier Maintenance**: Single system to understand

### ✅ **Migration Path Documented**

- Clear examples of old vs new job definitions
- Updated quick start to use unified system
- Command examples for Git hook integration
- Event simulation for testing

### ✅ **User Experience**

- **Immediate Value**: Quick start shows unified system working
- **Clear Commands**: All new hook-related commands documented
- **Architecture Clarity**: Benefits and design explained
- **Migration Guide**: Clear path from old to new system

---

## 🎯 Summary

The README now accurately reflects GitVan's **unified hooks system** architecture, providing users with:

1. **Clear Understanding** of the single execution mechanism
2. **Practical Examples** using the new hooks system
3. **Complete Command Reference** for unified hooks
4. **Architecture Benefits** explanation
5. **Migration Path** from old events system

**The result**: A comprehensive, accurate README that showcases GitVan's cleaner, more deterministic unified hooks system architecture.

---

*GitVan README Updated: Unified hooks system documentation complete.*
