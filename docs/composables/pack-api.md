# GitVan v2 - usePack Composable API Reference

## Overview

The `usePack` composable provides complete pack lifecycle management for GitVan v2, integrating seamlessly with the modular Git composables. It handles pack discovery, installation, application, removal, and maintenance operations.

## Import

```javascript
import { usePack } from "./src/composables/pack.mjs";
const pack = usePack();
```

## Context Properties

### `cwd`
Current working directory.

```javascript
const cwd = pack.cwd;
// Returns: "/Users/sac/gitvan"
```

### `config`
Pack system configuration.

```javascript
const config = pack.config;
// Returns: {
//   cwd: "/Users/sac/gitvan",
//   packsDir: "/Users/sac/gitvan/packs",
//   receiptsDir: "/Users/sac/gitvan/.gitvan/packs",
//   cacheDir: "/Users/sac/gitvan/.gitvan/cache",
//   registryUrl: "local-filesystem"
// }
```

## Pack Discovery

### `listAvailable(filters)`
List available packs from registry.

```javascript
const packs = await pack.listAvailable();
// Returns: [
//   {
//     id: "next-min",
//     name: "Next.js Minimal",
//     version: "1.0.0",
//     description: "Minimal Next.js setup",
//     tags: ["nextjs", "react", "minimal"],
//     category: "framework"
//   }
// ]

// With filters
const reactPacks = await pack.listAvailable({ 
  category: "framework",
  tags: ["react"] 
});
```

### `search(query, filters)`
Search packs by query and filters.

```javascript
const results = await pack.search("next", { 
  category: "framework" 
});
// Returns: [
//   {
//     id: "next-min",
//     name: "Next.js Minimal",
//     score: 0.95,
//     highlights: ["next", "minimal"]
//   }
// ]
```

### `getPackInfo(packId)`
Get detailed information about a specific pack.

```javascript
const info = await pack.getPackInfo("next-min");
// Returns: {
//   id: "next-min",
//   name: "Next.js Minimal",
//   version: "1.0.0",
//   description: "Minimal Next.js setup",
//   manifest: { /* full manifest */ },
//   dependencies: { /* dependency info */ }
// }
```

## Pack Installation

### `install(packId, inputs, options)`
Install a pack from registry.

```javascript
const result = await pack.install("next-min", {
  projectName: "my-app",
  useTypeScript: true,
  includeTailwind: false
});

// Returns: {
//   status: "OK",
//   message: "Pack installed successfully",
//   artifacts: [
//     { type: "file", target: "package.json" },
//     { type: "template", target: "pages/index.js" }
//   ]
// }
```

### `installLocal(packPath, inputs, options)`
Install a pack from local path.

```javascript
const result = await pack.installLocal("./my-custom-pack", {
  projectName: "my-app"
});
```

## Pack Management

### `listInstalled()`
List all installed packs.

```javascript
const installed = await pack.listInstalled();
// Returns: [
//   {
//     id: "next-min",
//     version: "1.0.0",
//     installedAt: "2025-09-17T07:55:03.135Z",
//     inputs: { projectName: "my-app" },
//     artifacts: [/* artifact list */]
//   }
// ]
```

### `getInstalled(packId)`
Get details of a specific installed pack.

```javascript
const installed = await pack.getInstalled("next-min");
// Returns: {
//   id: "next-min",
//   version: "1.0.0",
//   installedAt: "2025-09-17T07:55:03.135Z",
//   inputs: { projectName: "my-app" },
//   artifacts: [/* artifact list */]
// }
```

### `update(packId, inputs, options)`
Update an installed pack to a newer version.

```javascript
const result = await pack.update("next-min", {
  projectName: "my-app",
  useTypeScript: true
});

// Returns: {
//   status: "OK",
//   updated: true,
//   oldVersion: "1.0.0",
//   newVersion: "1.1.0",
//   risks: [],
//   changes: [/* change list */]
// }
```

### `remove(packId, options)`
Remove an installed pack.

```javascript
const result = await pack.remove("next-min", {
  force: false,
  keepArtifacts: false
});

// Returns: {
//   status: "OK",
//   removed: ["package.json", "pages/index.js"],
//   errors: [],
//   pack: "next-min",
//   version: "1.0.0"
// }
```

## Pack Application

### `apply(packId, inputs, options)`
Apply a pack to the current directory.

```javascript
const result = await pack.apply("next-min", {
  projectName: "my-app",
  useTypeScript: true
});

// Returns: {
//   status: "OK",
//   message: "Pack applied successfully",
//   artifacts: [/* applied artifacts */],
//   receipts: [/* receipt records */]
// }
```

### `plan(packId, inputs, options)`
Plan pack application without executing.

```javascript
const plan = await pack.plan("next-min", {
  projectName: "my-app"
});

// Returns: {
//   status: "OK",
//   operations: [
//     { type: "create", target: "package.json" },
//     { type: "create", target: "pages/index.js" }
//   ],
//   conflicts: [],
//   risks: []
// }
```

## Pack Validation

### `validateConstraints(packId)`
Validate pack constraints against current environment.

```javascript
const validation = await pack.validateConstraints("next-min");

// Returns: {
//   valid: true,
//   errors: [],
//   warnings: [],
//   requirements: {
//     node: ">=16.0.0",
//     gitvan: ">=2.0.0"
//   }
// }
```

### `checkIdempotency(packId)`
Check if pack is idempotent (can be applied multiple times safely).

```javascript
const isIdempotent = await pack.checkIdempotency("next-min");
// Returns: true
```

## Pack Creation

### `create(packId, template, inputs)`
Create a new pack from template.

```javascript
const result = await pack.create("my-custom-pack", "basic", {
  name: "My Custom Pack",
  version: "1.0.0",
  description: "A custom pack for my project"
});

// Returns: {
//   status: "OK",
//   message: "Pack my-custom-pack created successfully",
//   pack: { /* manifest */ },
//   path: "/Users/sac/gitvan/packs/my-custom-pack"
// }
```

## Pack Analysis

### `analyzeDependencies(packId)`
Analyze pack dependencies and potential conflicts.

```javascript
const analysis = await pack.analyzeDependencies("next-min");

// Returns: {
//   pack: "next-min",
//   version: "1.0.0",
//   dependencies: {
//     npm: {
//       dependencies: { "next": "^13.0.0" }
//     }
//   },
//   requirements: {
//     node: ">=16.0.0"
//   },
//   capabilities: ["nextjs", "react"],
//   conflicts: [],
//   recommendations: []
// }
```

### `getStats()`
Get comprehensive pack statistics.

```javascript
const stats = await pack.getStats();

// Returns: {
//   installed: {
//     count: 3,
//     packs: [
//       { id: "next-min", version: "1.0.0", installedAt: "2025-09-17T07:55:03.135Z" }
//     ]
//   },
//   available: {
//     count: 15,
//     categories: ["framework", "tooling", "template"],
//     tags: ["nextjs", "react", "typescript", "tailwind"]
//   },
//   registry: {
//     lastUpdated: "2025-09-17T07:55:03.135Z",
//     indexSize: 15
//   }
// }
```

## Receipt Management

### `recordInstallation(manifest, inputs, result)`
Record pack installation for audit trail.

```javascript
const receipt = await pack.recordInstallation(manifest, inputs, result);
// Returns: {
//   id: "next-min",
//   version: "1.0.0",
//   installedAt: "2025-09-17T07:55:03.135Z",
//   inputs: { projectName: "my-app" },
//   artifacts: [/* artifact list */],
//   status: "OK"
// }
```

### `recordApplication(manifest, inputs, result)`
Record pack application for audit trail.

```javascript
const receipt = await pack.recordApplication(manifest, inputs, result);
// Returns: {
//   id: "next-min",
//   version: "1.0.0",
//   appliedAt: "2025-09-17T07:55:03.135Z",
//   inputs: { projectName: "my-app" },
//   artifacts: [/* artifact list */],
//   status: "OK"
// }
```

## Utility Methods

### `refreshRegistry()`
Refresh the pack registry index.

```javascript
const result = await pack.refreshRegistry();

// Returns: {
//   status: "OK",
//   message: "Registry refreshed successfully",
//   lastUpdated: "2025-09-17T07:55:03.135Z"
// }
```

### `cleanup(options)`
Clean up old pack data and cache.

```javascript
const result = await pack.cleanup({ days: 30 });

// Returns: {
//   status: "OK",
//   message: "Cleanup completed",
//   cleaned: 5
// }
```

### `exportState()`
Export current pack state for backup.

```javascript
const state = await pack.exportState();

// Returns: {
//   exportedAt: "2025-09-17T07:55:03.135Z",
//   packs: {
//     "next-min": { /* pack data */ }
//   },
//   config: { /* config */ }
// }
```

### `importState(state)`
Import pack state from backup.

```javascript
const result = await pack.importState(state);

// Returns: {
//   status: "OK",
//   message: "State imported",
//   results: [
//     { packId: "next-min", result: { status: "OK" } }
//   ]
// }
```

## Usage Examples

### Complete Pack Workflow

```javascript
import { usePack } from "./src/composables/pack.mjs";

const pack = usePack();

// 1. Search for packs
const results = await pack.search("next", { category: "framework" });

// 2. Get pack details
const info = await pack.getPackInfo("next-min");

// 3. Plan installation
const plan = await pack.plan("next-min", {
  projectName: "my-app",
  useTypeScript: true
});

// 4. Install pack
const result = await pack.install("next-min", {
  projectName: "my-app",
  useTypeScript: true,
  includeTailwind: false
});

// 5. Check installation
const installed = await pack.listInstalled();
console.log(`Installed ${installed.length} packs`);

// 6. Get statistics
const stats = await pack.getStats();
console.log(`Available: ${stats.available.count} packs`);
```

### Pack Management

```javascript
// List installed packs
const installed = await pack.listInstalled();

// Update a pack
const updateResult = await pack.update("next-min", {
  projectName: "my-app"
});

// Remove a pack
const removeResult = await pack.remove("next-min");

// Clean up old data
await pack.cleanup({ days: 30 });
```

### Custom Pack Creation

```javascript
// Create a new pack
const result = await pack.create("my-custom-pack", "basic", {
  name: "My Custom Pack",
  version: "1.0.0",
  description: "A custom pack for my project",
  tags: ["custom", "internal"]
});

// Install the custom pack
await pack.installLocal(result.path, {
  projectName: "test-project"
});
```

## Error Handling

```javascript
try {
  const result = await pack.install("nonexistent-pack");
} catch (error) {
  console.error("Pack installation failed:", error.message);
}

// Handle specific error types
try {
  const result = await pack.install("next-min", {}, { force: true });
} catch (error) {
  if (error.message.includes("constraints not satisfied")) {
    console.error("Pack constraints not met");
  } else if (error.message.includes("already installed")) {
    console.error("Pack is already installed");
  }
}
```

## Integration with Git Composables

The `usePack` composable automatically integrates with Git operations:

- **Notes Integration**: All pack operations are recorded in Git notes
- **Commit Tracking**: Pack installations are tracked in commit history
- **Repository Awareness**: Pack operations respect Git repository state
- **Context Preservation**: Uses GitVan context for consistent behavior

## Best Practices

1. **Always plan before installing**: Use `plan()` to preview changes
2. **Validate constraints**: Check `validateConstraints()` before installation
3. **Handle errors gracefully**: Implement proper error handling
4. **Use receipts**: Leverage receipt management for audit trails
5. **Regular cleanup**: Use `cleanup()` to maintain system health
6. **Backup state**: Use `exportState()` for important configurations
