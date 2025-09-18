# GitVan v2 - Pack CLI Integration Guide

## Overview

The `usePack` composable provides full integration with GitVan's pack command system, allowing you to programmatically execute all pack operations that are available through the CLI.

## CLI Commands Integration

### Available Pack Commands

The `usePack` composable integrates with these CLI commands:

```bash
# CLI Commands
gitvan pack list                    # List installed packs
gitvan pack apply <pack>           # Apply a pack
gitvan pack plan <pack>            # Plan pack application
gitvan pack status                 # Show pack status
gitvan pack remove <pack>          # Remove a pack
gitvan pack update <pack>          # Update a pack

# Marketplace Commands
gitvan marketplace browse          # Browse available packs
gitvan marketplace search <query>  # Search packs
gitvan marketplace install <pack>  # Install from marketplace

# Scaffold Commands
gitvan scaffold <pack:scaffold>    # Run pack scaffolds

# Compose Commands
gitvan compose <pack1> <pack2>    # Compose multiple packs
```

## Programmatic CLI Integration

### Basic Usage

```javascript
import { usePack } from "./src/composables/pack.mjs";

const pack = usePack();

// Execute CLI-equivalent commands
const installed = await pack.executeCommand('list');
const status = await pack.executeCommand('status');
const plan = await pack.executeCommand('plan', { 
  pack: 'next-min',
  inputs: { projectName: 'my-app' }
});
```

### Command Execution

```javascript
// List installed packs (equivalent to: gitvan pack list)
const installed = await pack.executeCommand('list');

// Apply a pack (equivalent to: gitvan pack apply next-min --inputs '{"name":"test"}')
const result = await pack.executeCommand('apply', {
  pack: 'next-min',
  inputs: { projectName: 'my-app', useTypeScript: true }
});

// Plan pack application (equivalent to: gitvan pack plan next-min)
const plan = await pack.executeCommand('plan', {
  pack: 'next-min',
  inputs: { projectName: 'my-app' }
});

// Get pack status (equivalent to: gitvan pack status)
const status = await pack.executeCommand('status');

// Remove a pack (equivalent to: gitvan pack remove next-min)
const removeResult = await pack.executeCommand('remove', {
  pack: 'next-min',
  yes: true  // Skip confirmation
});

// Update a pack (equivalent to: gitvan pack update next-min)
const updateResult = await pack.executeCommand('update', {
  pack: 'next-min',
  inputs: { projectName: 'my-app' }
});
```

## Pack Path Resolution

The composable uses the same pack path resolution logic as the CLI:

```javascript
// Resolve pack path (same as CLI)
const packPath = await pack.resolvePackPath('next-min');

// Resolution order:
// 1. Local file path (if exists)
// 2. .gitvan/packs/<pack-id>
// 3. packs/<pack-id>
// 4. Marketplace/registry
```

## Status Integration

Get pack status in the same format as CLI:

```javascript
const status = await pack.getStatus();

// Returns:
// {
//   total: 3,
//   installed: [
//     {
//       id: "next-min",
//       version: "1.0.0",
//       mode: "existing-repo",
//       applied: "2025-09-17T07:55:03.135Z",
//       fingerprint: "abc123..."
//     }
//   ]
// }
```

## Marketplace Integration

```javascript
// Browse available packs (equivalent to: gitvan marketplace browse)
const available = await pack.listAvailable();

// Search packs (equivalent to: gitvan marketplace search "next")
const results = await pack.search("next", { category: "framework" });

// Get pack info (equivalent to: gitvan marketplace inspect next-min)
const info = await pack.getPackInfo("next-min");

// Install from marketplace (equivalent to: gitvan marketplace install next-min)
const result = await pack.install("next-min", {
  projectName: "my-app",
  useTypeScript: true
});
```

## Complete CLI Workflow Example

```javascript
import { usePack } from "./src/composables/pack.mjs";

async function completePackWorkflow() {
  const pack = usePack();

  try {
    // 1. Browse available packs
    console.log("📦 Browsing available packs...");
    const available = await pack.listAvailable();
    console.log(`Found ${available.length} packs`);

    // 2. Search for specific packs
    console.log("\n🔍 Searching for Next.js packs...");
    const nextPacks = await pack.search("next", { category: "framework" });
    console.log(`Found ${nextPacks.length} Next.js packs`);

    // 3. Get detailed info
    if (nextPacks.length > 0) {
      const packInfo = await pack.getPackInfo(nextPacks[0].id);
      console.log(`\n📋 Pack: ${packInfo.name} v${packInfo.version}`);
      console.log(`Description: ${packInfo.description}`);
    }

    // 4. Plan installation
    console.log("\n📋 Planning installation...");
    const plan = await pack.executeCommand('plan', {
      pack: 'next-min',
      inputs: { projectName: 'my-app' }
    });
    console.log(`Plan: ${plan.plan.steps.length} steps`);

    // 5. Install pack
    console.log("\n⚡ Installing pack...");
    const result = await pack.executeCommand('apply', {
      pack: 'next-min',
      inputs: { projectName: 'my-app', useTypeScript: true }
    });

    if (result.status === 'OK') {
      console.log("✅ Pack installed successfully");
    } else {
      console.log(`❌ Installation failed: ${result.message}`);
    }

    // 6. Check status
    console.log("\n📊 Checking pack status...");
    const status = await pack.executeCommand('status');
    console.log(`Total packs: ${status.total}`);

    // 7. List installed packs
    console.log("\n📋 Installed packs:");
    const installed = await pack.executeCommand('list');
    installed.forEach(p => {
      console.log(`  - ${p.id}@${p.version}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the workflow
completePackWorkflow();
```

## Error Handling

```javascript
try {
  const result = await pack.executeCommand('apply', {
    pack: 'nonexistent-pack'
  });
} catch (error) {
  if (error.message.includes('Pack not found')) {
    console.error('Pack not found in registry or local directories');
  } else if (error.message.includes('constraints not satisfied')) {
    console.error('Pack constraints not met');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Advanced Integration

### Custom Pack Resolution

```javascript
// Add custom pack resolution logic
const customPack = usePack({
  packsDir: '/custom/packs',
  registryUrl: 'https://custom-registry.com'
});

// Resolve pack with custom configuration
const packPath = await customPack.resolvePackPath('my-custom-pack');
```

### Batch Operations

```javascript
// Install multiple packs
const packsToInstall = ['next-min', 'tailwind-css', 'eslint-config'];

for (const packId of packsToInstall) {
  try {
    const result = await pack.executeCommand('apply', {
      pack: packId,
      inputs: { projectName: 'my-app' }
    });
    console.log(`✅ Installed ${packId}`);
  } catch (error) {
    console.error(`❌ Failed to install ${packId}:`, error.message);
  }
}
```

### Pack Composition

```javascript
// Compose multiple packs (equivalent to: gitvan compose pack1 pack2)
const composer = new PackComposer();

const result = await composer.compose([
  'next-min',
  'tailwind-css',
  'eslint-config'
], {
  inputs: { projectName: 'my-app' },
  ignoreConflicts: false,
  continueOnError: true
});
```

## Integration with Git Operations

The pack composable automatically integrates with Git operations:

```javascript
// All pack operations are recorded in Git notes
const git = useGit();
const notes = useNotes();

// Install pack
await pack.install('next-min', { projectName: 'my-app' });

// Check Git notes for pack operations
const recentNotes = await notes.notesList();
console.log('Recent pack operations:', recentNotes);

// Get current commit info
const headSha = await git.headSha();
const commitInfo = await git.log({ maxCount: 1 });
console.log('Current commit:', commitInfo[0]);
```

## Best Practices

1. **Always plan before applying**: Use `plan` command to preview changes
2. **Handle errors gracefully**: Implement proper error handling for all operations
3. **Use receipts**: Leverage receipt management for audit trails
4. **Check constraints**: Validate pack constraints before installation
5. **Batch operations**: Use composition for multiple pack installations
6. **Git integration**: Leverage Git notes for operation tracking

## CLI Command Mapping

| CLI Command | Composable Method | Description |
|-------------|------------------|-------------|
| `gitvan pack list` | `executeCommand('list')` | List installed packs |
| `gitvan pack apply <pack>` | `executeCommand('apply', {pack})` | Apply a pack |
| `gitvan pack plan <pack>` | `executeCommand('plan', {pack})` | Plan pack application |
| `gitvan pack status` | `executeCommand('status')` | Get pack status |
| `gitvan pack remove <pack>` | `executeCommand('remove', {pack})` | Remove a pack |
| `gitvan pack update <pack>` | `executeCommand('update', {pack})` | Update a pack |
| `gitvan marketplace browse` | `listAvailable()` | Browse available packs |
| `gitvan marketplace search <query>` | `search(query)` | Search packs |
| `gitvan marketplace install <pack>` | `install(pack)` | Install from marketplace |

This integration ensures that all pack operations available through the CLI are also available programmatically through the `usePack` composable, providing a consistent and powerful API for pack management.
