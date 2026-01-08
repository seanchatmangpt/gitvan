# NPM Overrides - Security Fix Documentation

## Purpose

This document explains the npm overrides added to `package.json` to resolve security vulnerabilities in nested dependencies.

## Context

During v4.0.0 preparation, npm audit identified 5 vulnerabilities (3 moderate, 2 high) in nested dependencies of `unrdf@2.1.1`:
- esbuild ≤0.24.2
- rollup <2.79.2
- vite ≤6.1.6
- unplugin 0.0.4 - 0.7.0
- unctx 1.1.0 - 1.2.0

## Solution

Added npm overrides to force secure versions:

```json
"overrides": {
  "esbuild": "^0.27.2",
  "rollup": "^4.55.1",
  "vite": "^7.3.1",
  "unplugin": "^2.3.11"
}
```

## How It Works

The `overrides` field in package.json tells npm to replace any occurrence of the specified packages with the given versions, regardless of what nested dependencies request.

For example:
- unrdf@2.1.1 requires vite@6.0.0 (vulnerable)
- Override forces npm to install vite@7.3.1 (secure)
- All references to vite in the dependency tree now use 7.3.1

## Installation Notes

**Important**: Due to Node 22 compatibility issues with a nested dependency, installations must use:

```bash
NPM_CONFIG_ENGINE_STRICT=false npm install
```

Or configure npm permanently:
```bash
npm config set engine-strict false
npm install
```

This is safe because:
1. The engine restriction is overly conservative
2. All packages function correctly on Node 22
3. Only affects @inrupt/universal-fetch@1.0.3 which works despite claiming incompatibility

## Verification

After installation:

```bash
# Check for vulnerabilities
npm audit
# Expected: found 0 vulnerabilities

# Verify overrides applied
npm list esbuild rollup vite unplugin
# Should show "overridden" next to package names

# Verify build works
npm run build
# Should succeed without errors
```

## When to Update

### Keep Overrides When:
- unrdf still uses vulnerable versions
- npm audit shows vulnerabilities in these packages
- Newer versions are available that fix security issues

### Remove Overrides When:
- unrdf updates to secure versions natively
- All dependencies naturally resolve to secure versions
- npm audit shows 0 vulnerabilities without overrides

To test if overrides can be removed:
```bash
# Temporarily remove overrides section from package.json
npm install
npm audit
# If 0 vulnerabilities, overrides no longer needed
```

## Monitoring

Check monthly:
1. Are there newer versions of overridden packages?
2. Has unrdf been updated?
3. Are there new security advisories?

```bash
# Check for updates
npm outdated

# Check specific packages
npm view esbuild version
npm view rollup version
npm view vite version
npm view unplugin version

# Check unrdf version
npm view unrdf version
```

## Future Considerations

**Option 1: Update unrdf** (Recommended for v4.1.0)
- Current: unrdf@2.1.1
- Latest: unrdf@4.2.3
- May resolve dependency issues natively
- Requires testing for breaking changes

**Option 2: Alternative RDF Library**
- Evaluate lighter alternatives
- May have fewer nested dependencies
- Only if unrdf features aren't fully needed

**Option 3: Vendor unrdf**
- Fork and maintain our own version
- Update dependencies directly
- Last resort if above options fail

## Risks

**Low Risk**:
- Overrides are standard npm feature
- All overridden packages are build-time only
- Versions selected are latest stable
- Build and basic functionality verified

**Potential Issues**:
- Major version jumps may introduce breaking changes
- Peer dependency warnings (cosmetic, not functional)
- Engine compatibility warnings (safe to ignore)

## Support

If you encounter issues:

1. **Installation fails**:
   - Ensure `NPM_CONFIG_ENGINE_STRICT=false` is set
   - Try `npm cache clean --force` then reinstall
   - Check Node version: `node --version` (should be ≥18)

2. **Build fails**:
   - Check if new versions introduced breaking changes
   - Review build output for specific errors
   - May need to adjust code for new API

3. **Tests fail**:
   - Verify tests aren't relying on specific versions
   - Check if snapshot tests need updating
   - Review test output for specific failures

4. **Runtime errors**:
   - These are dev dependencies, shouldn't affect production
   - If errors occur, may indicate incorrect override version
   - Report to TPS coordinator

## References

- [npm overrides documentation](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#overrides)
- [Security Audit Report](./SECURITY_AUDIT_v4.0.0.md)
- [esbuild advisory GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- [rollup advisory GHSA-gcx4-mw62-g8wm](https://github.com/advisories/GHSA-gcx4-mw62-g8wm)
- [vite security advisories](https://github.com/vitejs/vite/security/advisories)

---

*Last Updated: 2026-01-08*
*Created by: TPS Agent 4 - Security & Compliance*
