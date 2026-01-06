# GitVan v3 to v4 Migration Guide

> **Version:** 4.0.0 (Planning)
> **Migration Timeline:** 6 months

This guide helps you migrate from GitVan v3 to v4.

## Migration Timeline

| Phase | Duration | Actions |
|-------|----------|---------|
| **Deprecation (v3.5+)** | 3 months | Warnings added, begin migration |
| **Migration (v4.0)** | 3 months | v4 released, v3 still works |
| **Breaking (v4.5)** | - | v3 support ends |

## Key Breaking Changes

### 1. ES Modules Required

**v3:**
```javascript
module.exports = {
  jobs: { dir: "jobs" }
};
```

**v4:**
```javascript
export default {
  jobs: { dir: "jobs" }
};
```

### 2. Nested Configuration

**v3:**
```javascript
{
  jobsDir: "jobs",
  templatesDir: "templates"
}
```

**v4:**
```javascript
{
  jobs: { dir: "jobs" },
  templates: { dirs: ["templates"] }
}
```

### 3. Context Wrapper Required

**v3:**
```javascript
const git = useGit();
await git.branch();
```

**v4:**
```javascript
await withGitVan({ cwd: process.cwd() }, async () => {
  const git = useGit();
  await git.branch();
});
```

## Auto-Migration Tool

```bash
# Install v4
npm install gitvan@^4.0.0

# Run migration
npx gitvan migrate

# Dry run first
npx gitvan migrate --dry-run

# Validate
gitvan config validate
```

## Support

- **v3 Support Until:** July 2026
- **Documentation:** https://gitvan.dev/docs/migration
- **Issues:** https://github.com/gitvan/gitvan/issues

See [Complete Migration Guide](https://gitvan.dev/docs/migration/complete) for details.
