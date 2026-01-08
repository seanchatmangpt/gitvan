# Windows Compatibility Guide

## Overview

GitVan v4.0.0 is fully compatible with Windows, macOS, and Linux. This document describes the cross-platform compatibility features, Windows-specific considerations, and how to ensure your workflows run correctly on all platforms.

## Table of Contents

1. [Platform Support](#platform-support)
2. [Windows-Specific Issues](#windows-specific-issues)
3. [Path Handling](#path-handling)
4. [File Operations](#file-operations)
5. [Environment Variables](#environment-variables)
6. [Testing on Windows](#testing-on-windows)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Platform Support

GitVan has been tested and verified on:

- **Windows**: Windows 10, Windows 11, Windows Server 2019+
- **macOS**: macOS 10.15 (Catalina) and later
- **Linux**: Ubuntu 20.04+, Debian 10+, CentOS 8+, Alpine Linux

### System Requirements

- **Node.js**: 18.0.0 or later
- **Git**: 2.20.0 or later
- **Disk Space**: Minimum 100MB free for worker files and cache
- **Memory**: Minimum 512MB available RAM

---

## Windows-Specific Issues

### 1. Path Separators

**Issue**: Windows uses backslashes (`\`) while Unix uses forward slashes (`/`).

**Solution**: GitVan automatically normalizes all paths using the `pathe` library.

```javascript
import { join, normalize } from "pathe";

// Works on all platforms
const path = join("C:", "Users", "test", "file.js");
// Windows: C:\Users\test\file.js
// Unix: C:/Users/test/file.js
```

### 2. Drive Letters

**Issue**: Windows paths include drive letters (C:, D:, etc.), which don't exist on Unix.

**Solution**: GitVan's `isDrivePath()` function detects drive letters and handles them appropriately.

```javascript
import { isDrivePath, pathToFileURL } from "gitvan/utils/security";

const path = "C:\\Projects\\app.js";
console.log(isDrivePath(path)); // true on Windows, false on Unix

// Converts to proper file:// URL
const fileUrl = pathToFileURL(path);
// Windows: file:///C:/Projects/app.js
// Unix: file:///Projects/app.js
```

### 3. UNC Paths

**Issue**: Windows supports UNC paths (`\\server\share\file`), which are network paths.

**Solution**: GitVan detects and handles UNC paths correctly.

```javascript
import { isUNCPath, pathToFileURL } from "gitvan/utils/security";

const uncPath = "\\\\server\\share\\file.js";
console.log(isUNCPath(uncPath)); // true on Windows

const fileUrl = pathToFileURL(uncPath);
// Result: file://server/share/file.js
```

### 4. Reserved Filenames

**Issue**: Windows reserves certain filenames (CON, PRN, AUX, NUL, COM1-9, LPT1-9).

**Solution**: GitVan validates paths before creating files.

```javascript
import { isReservedName, validateWindowsPath } from "gitvan/utils/security";

console.log(isReservedName("CON")); // true
console.log(isReservedName("CON.txt")); // true
console.log(isReservedName("config.txt")); // false

const validation = validateWindowsPath("C:\\Users\\CON\\file.js");
console.log(validation.valid); // false
console.log(validation.error); // "Path contains reserved Windows name: CON"
```

### 5. Path Length Limits

**Issue**: Windows has a 260-character path length limit (MAX_PATH).

**Solution**: GitVan validates path lengths and warns when approaching the limit.

```javascript
import { validateWindowsPath } from "gitvan/utils/security";

const longPath = "C:\\" + "a".repeat(270);
const validation = validateWindowsPath(longPath);
console.log(validation.valid); // false
console.log(validation.error); // "Path exceeds Windows maximum length..."
```

**Workaround**: Use shorter paths or enable long path support in Windows 10+:

```powershell
# Run as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### 6. Case Sensitivity

**Issue**: Windows filesystems are case-insensitive, while Unix filesystems are case-sensitive.

**Impact**: `file.js` and `File.js` are the same file on Windows, but different on Unix.

**Best Practice**: Always use consistent casing in filenames across all platforms.

---

## Path Handling

### File URL Generation

GitVan automatically converts file paths to `file://` URLs for dynamic imports:

```javascript
import { pathToFileURL } from "gitvan/utils/security";

// Windows
pathToFileURL("C:\\Projects\\job.mjs");
// ’ file:///C:/Projects/job.mjs

// Unix
pathToFileURL("/home/user/job.mjs");
// ’ file:///home/user/job.mjs

// Windows UNC
pathToFileURL("\\\\server\\share\\job.mjs");
// ’ file://server/share/job.mjs
```

### Path Normalization

All paths are automatically normalized:

```javascript
import { normalize } from "pathe";

// Mixed separators
normalize("C:/Users\\test/file.js");
// ’ C:/Users/test/file.js (Windows)
// ’ C:/Users/test/file.js (Unix)

// Redundant separators
normalize("C:\\\\Users\\\\\\test");
// ’ C:/Users/test
```

### Relative vs Absolute Paths

GitVan always converts relative paths to absolute paths internally:

```javascript
import { resolve } from "pathe";

// Current directory: C:\Projects\gitvan
const relativePath = "jobs/my-job.mjs";
const absolutePath = resolve(relativePath);
// ’ C:/Projects/gitvan/jobs/my-job.mjs
```

---

## File Operations

### Line Endings

**Issue**: Windows uses CRLF (`\r\n`), Unix uses LF (`\n`).

**Solution**: GitVan normalizes all generated files to LF for consistency.

```javascript
import { normalizeLineEndings } from "gitvan/utils/security";

const windowsContent = "line1\r\nline2\r\nline3\r\n";
const normalized = normalizeLineEndings(windowsContent);
// ’ "line1\nline2\nline3\n"
```

**Git Configuration**: Ensure Git is configured correctly:

```bash
# Recommended Git configuration for cross-platform projects
git config --global core.autocrlf input   # Convert CRLF to LF on commit
git config --global core.eol lf           # Always use LF in working directory
```

**.gitattributes**: Add to your repository root:

```
* text=auto eol=lf
*.{cmd,[cC][mM][dD]} text eol=crlf
*.{bat,[bB][aA][tT]} text eol=crlf
```

### File Locking

**Issue**: Windows locks files more aggressively than Unix, causing deletion failures.

**Solution**: GitVan uses retry logic with exponential backoff for file operations.

```javascript
import { deleteFileWithRetry } from "gitvan/utils/platform";

// Automatically retries on Windows file locking errors
await deleteFileWithRetry(filePath, {
  maxRetries: 3,         // Retry up to 3 times
  initialDelay: 100,     // Wait 100ms before first retry
  backoffFactor: 2,      // Double delay each retry (100ms, 200ms, 400ms)
});
```

### Temp Directory

**Issue**: Windows uses `%TEMP%`, Unix uses `/tmp`.

**Solution**: Use `getTempDir()` for cross-platform temp directory:

```javascript
import { getTempDir } from "gitvan/utils/platform";

const tempDir = getTempDir();
// Windows: C:\Users\username\AppData\Local\Temp
// Unix: /tmp
```

---

## Environment Variables

### Case Sensitivity

**Issue**: Windows environment variables are case-insensitive, but `process.env` in Node.js is case-sensitive.

**Solution**: Use `getEnvVar()` for case-insensitive lookup on Windows:

```javascript
import { getEnvVar } from "gitvan/utils/platform";

// Windows: Works with PATH, Path, path
const path = getEnvVar("PATH");

// Fallback value
const customVar = getEnvVar("MY_VAR", "default-value");
```

### Setting Variables

```javascript
import { setEnvVar } from "gitvan/utils/platform";

// Sets both cases on Windows for compatibility
setEnvVar("MY_VAR", "value");
// Windows: Sets both MY_VAR and my_var
// Unix: Sets only MY_VAR
```

### Environment Normalization

GitVan normalizes the environment for deterministic execution:

```javascript
import { normalizeEnvironment } from "gitvan/utils/platform";

const normalized = normalizeEnvironment();
// Always includes:
// - TZ=UTC (consistent timezone)
// - LANG=C (consistent locale)
// - LC_ALL=C (consistent collation)
```

---

## Testing on Windows

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific tests
npm test -- security-windows.test.mjs
npm test -- platform.test.mjs
```

### Windows-Specific Test Setup

Tests automatically detect the platform and adjust expectations:

```javascript
import { describe, it, expect } from "vitest";
import { isWindows } from "gitvan/utils/security";

it("should handle platform-specific paths", () => {
  if (isWindows()) {
    expect(path).toMatch(/^[A-Z]:\\/);
  } else {
    expect(path).toMatch(/^\//);
  }
});
```

### CI/CD on Windows

**GitHub Actions**:

```yaml
name: Windows Tests
on: [push, pull_request]
jobs:
  test-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test
```

**GitLab CI**:

```yaml
test:windows:
  image: mcr.microsoft.com/windows/servercore:ltsc2022
  tags:
    - windows
  script:
    - npm install
    - npm test
```

---

## Troubleshooting

### Problem: "File is locked" errors

**Symptom**: Errors like `EBUSY`, `EPERM`, or `EACCES` when deleting files.

**Cause**: Windows locks files that are in use.

**Solution**:
1. GitVan automatically retries with exponential backoff
2. Ensure no other processes have the file open
3. Increase retry count if needed:

```javascript
await deleteFileWithRetry(file, { maxRetries: 5 });
```

### Problem: "Path too long" errors

**Symptom**: `ENAMETOOLONG` or "The specified path, file name, or both are too long".

**Cause**: Windows 260-character path limit.

**Solutions**:
1. Use shorter project paths (e.g., `C:\proj` instead of `C:\Users\...\Documents\Projects\...`)
2. Enable long path support (Windows 10 1607+):
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
     -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```
3. Restart your system after enabling

### Problem: "Cannot find module" with correct path

**Symptom**: Module import fails even though the file exists.

**Cause**: Incorrect `file://` URL format on Windows.

**Solution**: Use `pathToFileURL()` for dynamic imports:

```javascript
// L WRONG - won't work on Windows
const module = await import(`file://${path}`);

//  CORRECT - works on all platforms
import { pathToFileURL } from "gitvan/utils/security";
const fileUrl = pathToFileURL(path);
const module = await import(fileUrl);
```

### Problem: Line ending issues in Git

**Symptom**: Git shows all files as modified, or files have mixed line endings.

**Solution**:
1. Configure Git globally:
   ```bash
   git config --global core.autocrlf input
   git config --global core.eol lf
   ```

2. Add `.gitattributes` to your repository:
   ```
   * text=auto eol=lf
   ```

3. Normalize existing files:
   ```bash
   git rm --cached -r .
   git reset --hard
   ```

### Problem: Environment variable not found

**Symptom**: `process.env.PATH` returns `undefined` but `process.env.Path` works.

**Cause**: Case sensitivity in `process.env`.

**Solution**: Use `getEnvVar()`:

```javascript
import { getEnvVar } from "gitvan/utils/platform";
const path = getEnvVar("PATH"); // Works with any case on Windows
```

---

## Best Practices

### 1. Always Use Path Utilities

```javascript
// L Avoid platform-specific code
const path = process.platform === 'win32'
  ? 'C:\\path\\to\\file'
  : '/path/to/file';

//  Use cross-platform utilities
import { join } from "pathe";
const path = join(baseDir, "path", "to", "file");
```

### 2. Normalize Paths Early

```javascript
import { normalize } from "pathe";

function processFile(userPath) {
  // Normalize immediately
  const normalizedPath = normalize(userPath);
  // ... rest of code
}
```

### 3. Use file:// URLs for Dynamic Imports

```javascript
import { pathToFileURL } from "gitvan/utils/security";

// Always convert paths to file:// URLs
const fileUrl = pathToFileURL(absolutePath);
const module = await import(fileUrl);
```

### 4. Handle File Operations with Retry

```javascript
import { deleteFileWithRetry } from "gitvan/utils/platform";

// Use retry logic for all file deletions
await deleteFileWithRetry(filePath);
```

### 5. Validate Paths on Windows

```javascript
import { validateWindowsPath } from "gitvan/utils/security";

const validation = validateWindowsPath(userProvidedPath);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

### 6. Test on Multiple Platforms

- Run tests locally on your development platform
- Use CI/CD to test on Windows, macOS, and Linux
- Test with real Windows paths (drive letters, UNC paths)

### 7. Document Platform-Specific Behavior

If your code has platform-specific behavior, document it clearly:

```javascript
/**
 * Deletes a file with retry logic
 *
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<boolean>} True if deleted
 *
 * @platform Windows - Retries up to 3 times due to file locking
 * @platform Unix - Single attempt (no locking issues)
 */
export async function deleteFile(filePath) {
  // ...
}
```

---

## Platform Information

### Detecting Platform

```javascript
import { getPlatformInfo, isWindows } from "gitvan/utils";

// Simple check
if (isWindows()) {
  // Windows-specific code
}

// Detailed information
const info = getPlatformInfo();
console.log(info);
// {
//   platform: 'win32',
//   isWindows: true,
//   isMac: false,
//   isLinux: false,
//   arch: 'x64',
//   nodeVersion: 'v18.0.0',
//   tempDir: 'C:\\Users\\...\\AppData\\Local\\Temp'
// }
```

### CI Environment Detection

```javascript
import { isCI } from "gitvan/utils/platform";

if (isCI()) {
  console.log("Running in CI environment");
  // Adjust behavior for CI (e.g., longer timeouts)
}
```

---

## Summary

GitVan v4.0.0 provides comprehensive Windows compatibility through:

1. **Automatic path normalization** - Handles `/` and `\` transparently
2. **Drive letter and UNC path support** - Proper `file://` URL generation
3. **Reserved name validation** - Prevents Windows-specific filename conflicts
4. **File operation retry logic** - Handles Windows file locking gracefully
5. **Line ending normalization** - Consistent LF endings across platforms
6. **Environment variable handling** - Case-insensitive lookup on Windows
7. **Comprehensive testing** - All features tested on Windows, macOS, and Linux

By following the best practices in this guide, you can ensure your GitVan workflows run correctly on all platforms.

---

## Additional Resources

- [GitVan Documentation](../README.md)
- [CLAUDE.md - Developer Guide](../CLAUDE.md)
- [Node.js Path Module](https://nodejs.org/api/path.html)
- [Windows File Naming Conventions](https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file)
- [Git Line Ending Configuration](https://git-scm.com/docs/git-config#Documentation/git-config.txt-coreeol)

---

**Last Updated**: January 8, 2026
**Version**: GitVan v4.0.0
**Platforms**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
