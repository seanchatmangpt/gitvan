# GitVan v2 - Pack CLI Integration Quick Reference

## Import

```javascript
import { usePack } from "./src/composables/pack.mjs";
const pack = usePack();
```

## CLI Command Execution

```javascript
// List installed packs (gitvan pack list)
const installed = await pack.executeCommand('list');

// Apply pack (gitvan pack apply <pack>)
const result = await pack.executeCommand('apply', {
  pack: 'next-min',
  inputs: { projectName: 'my-app' }
});

// Plan pack (gitvan pack plan <pack>)
const plan = await pack.executeCommand('plan', {
  pack: 'next-min',
  inputs: { projectName: 'my-app' }
});

// Get status (gitvan pack status)
const status = await pack.executeCommand('status');

// Remove pack (gitvan pack remove <pack>)
const removed = await pack.executeCommand('remove', {
  pack: 'next-min',
  yes: true
});

// Update pack (gitvan pack update <pack>)
const updated = await pack.executeCommand('update', {
  pack: 'next-min',
  inputs: { projectName: 'my-app' }
});
```

## Pack Path Resolution

```javascript
const packPath = await pack.resolvePackPath('next-min');
// Resolution order: local path → .gitvan/packs → packs → registry
```

## Status Integration

```javascript
const status = await pack.getStatus();
// Returns: { total: number, installed: Array<PackInfo> }
```

## Marketplace Integration

```javascript
const available = await pack.listAvailable();           // Browse packs
const results = await pack.search("next");            // Search packs
const info = await pack.getPackInfo("next-min");       // Get pack info
const installed = await pack.install("next-min");      // Install pack
```

## Complete Workflow

```javascript
// 1. Browse and search
const available = await pack.listAvailable();
const nextPacks = await pack.search("next");

// 2. Get info and plan
const info = await pack.getPackInfo("next-min");
const plan = await pack.executeCommand('plan', {
  pack: 'next-min',
  inputs: { projectName: 'my-app' }
});

// 3. Install and verify
const result = await pack.executeCommand('apply', {
  pack: 'next-min',
  inputs: { projectName: 'my-app' }
});

// 4. Check status
const status = await pack.executeCommand('status');
const installed = await pack.executeCommand('list');
```

## Error Handling

```javascript
try {
  const result = await pack.executeCommand('apply', {
    pack: 'nonexistent-pack'
  });
} catch (error) {
  if (error.message.includes('Pack not found')) {
    console.error('Pack not found');
  } else if (error.message.includes('constraints')) {
    console.error('Constraints not satisfied');
  }
}
```

## CLI Command Mapping

| CLI | Composable | Description |
|-----|------------|-------------|
| `gitvan pack list` | `executeCommand('list')` | List installed |
| `gitvan pack apply <pack>` | `executeCommand('apply', {pack})` | Apply pack |
| `gitvan pack plan <pack>` | `executeCommand('plan', {pack})` | Plan pack |
| `gitvan pack status` | `executeCommand('status')` | Get status |
| `gitvan pack remove <pack>` | `executeCommand('remove', {pack})` | Remove pack |
| `gitvan pack update <pack>` | `executeCommand('update', {pack})` | Update pack |
| `gitvan marketplace browse` | `listAvailable()` | Browse packs |
| `gitvan marketplace search <query>` | `search(query)` | Search packs |
| `gitvan marketplace install <pack>` | `install(pack)` | Install pack |

## Batch Operations

```javascript
// Install multiple packs
const packs = ['next-min', 'tailwind-css', 'eslint-config'];
for (const packId of packs) {
  await pack.executeCommand('apply', {
    pack: packId,
    inputs: { projectName: 'my-app' }
  });
}
```

## Git Integration

```javascript
// All operations are recorded in Git notes
const git = useGit();
const notes = useNotes();

await pack.install('next-min', { projectName: 'my-app' });

// Check Git notes
const recentNotes = await notes.notesList();
const headSha = await git.headSha();
```
