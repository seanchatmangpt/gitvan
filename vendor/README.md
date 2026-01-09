# Vendor Directory

This directory contains git submodules for dependencies that GitVan builds from source instead of using npm packages.

## unrdf Submodule

The `unrdf` library is included as a git submodule rather than an npm dependency. This allows GitVan to:

1. Track specific commits/versions of unrdf
2. Make local modifications if needed
3. Ensure reproducible builds
4. Reduce dependency on npm registry

### Initial Setup

After cloning the GitVan repository, initialize the submodule:

```bash
git submodule update --init --recursive
```

This happens automatically during `npm install` via the postinstall script.

### Building unrdf

The unrdf submodule needs to be built before GitVan can use it:

```bash
cd vendor/unrdf
npm install
npm run build
cd ../..
```

### Updating unrdf

To update to the latest version of unrdf:

```bash
cd vendor/unrdf
git fetch origin
git checkout main
git pull origin main
npm install
npm run build
cd ../..
git add vendor/unrdf
git commit -m "chore: update unrdf submodule"
```

### Build Integration

GitVan's build configuration (`build.config.ts`) automatically resolves `import ... from "unrdf"` statements to `vendor/unrdf/dist/index.mjs`. The build process verifies that:

1. The `vendor/unrdf` directory exists
2. The `vendor/unrdf/dist` directory exists (built artifacts)

If these checks fail, the build will exit with an error message.

### TypeScript Configuration

The `tsconfig.json` includes path mappings for unrdf:

```json
{
  "paths": {
    "unrdf": ["./vendor/unrdf/dist/index.mjs"],
    "unrdf/*": ["./vendor/unrdf/dist/*"]
  }
}
```

This ensures TypeScript can resolve imports during development and type checking.

## Troubleshooting

### Submodule not initialized

```
❌ ERROR: vendor/unrdf submodule not found!
```

**Solution**: Run `git submodule update --init --recursive`

### unrdf not built

```
⚠️  WARNING: vendor/unrdf/dist not found!
```

**Solution**: 
```bash
cd vendor/unrdf
npm install && npm run build
```

### Submodule shows as modified

This is normal if you've built the submodule locally. The build artifacts are gitignored in the unrdf repository.

### Updating after pulling changes

```bash
git submodule update --recursive
cd vendor/unrdf
npm install && npm run build
```
