# Windows Compatibility Guide for Job System

GitVan v4.0.0 - Bree Integration

## Table of Contents

- [Known Issues on Windows](#known-issues-on-windows)
- [Compatibility Solutions](#compatibility-solutions)
- [Testing on Windows](#testing-on-windows)
- [Windows-Specific Configuration](#windows-specific-configuration)
- [Troubleshooting Windows Issues](#troubleshooting-windows-issues)

---

## Known Issues on Windows

### 1. Path Separator Differences

**Issue:** Windows uses backslashes (`\`), Unix uses forward slashes (`/`)

**Impact:** Worker file generation, job imports

**Status:** ✅ FIXED in GitVan v4.0.0

**How GitVan Handles It:**
```javascript
// JobBridge automatically handles platform differences
const fileUrl = 'file://' +
  (process.platform === 'win32' ? '/' : '') +
  jobDef.file.replace(/\\/g, '/');

// Result on Windows: file:///C:/Users/path/to/job.mjs
// Result on Unix: file:///home/user/path/to/job.mjs
```

### 2. File Locking Behavior

**Issue:** Windows locks files more aggressively than Unix

**Impact:** Worker file cleanup, concurrent access

**Workaround:**
```javascript
// Retry file operations on Windows
async function deleteFileWithRetry(path, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fs.rm(path);
      return;
    } catch (error) {
      if (error.code === 'EBUSY' && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Worker Thread Isolation Differences

**Issue:** Windows handles worker thread memory differently

**Impact:** Memory usage patterns may differ

**Mitigation:**
- Monitor memory on Windows specifically
- Adjust resource limits if needed

### 4. Line Ending Handling

**Issue:** Windows uses CRLF (`\r\n`), Unix uses LF (`\n`)

**Impact:** Generated worker files, job files

**Solution:**
```bash
# Configure Git to handle line endings
git config core.autocrlf true

# Or use .gitattributes
echo "*.mjs text eol=lf" >> .gitattributes
```

---

## Compatibility Solutions

### File:// URL Handling

**Implementation in JobBridge:**
```javascript
createWorkerFile(jobDef) {
  const jobId = jobDef.id || jobDef.name || jobDef.meta?.name;
  const workerFileName = `${jobId.replace(/[:/]/g, '-')}-worker.mjs`;
  const workerPath = join(this.workerDir, workerFileName);

  // Convert Windows path to file:// URL
  const jobFilePath = jobDef.file.replace(/\\/g, '/');
  const fileUrl = 'file://' +
    (process.platform === 'win32' ? '/' : '') +
    jobFilePath;

  const workerContent = `
import { parentPort, workerData } from 'worker_threads';

async function runJob() {
  const jobModule = await import('${fileUrl}');
  // ...
}

runJob().catch(error => {
  console.error('Worker execution failed:', error);
  process.exit(1);
});
  `;

  writeFileSync(workerPath, workerContent.trim(), 'utf8');
  return workerPath;
}
```

### Path Normalization

**Use `pathe` library** (already used in GitVan):
```javascript
import { join, normalize, resolve } from 'pathe';

// Always use pathe, not node:path
const jobPath = join('jobs', 'backup-job.mjs');  // ✓ Cross-platform
const absPath = resolve(jobPath);                // ✓ Cross-platform

// Avoid
const badPath = 'jobs\\backup-job.mjs';  // ✗ Windows-specific
```

### Platform Detection

**Check platform when needed:**
```javascript
function getPlatformSpecificConfig() {
  if (process.platform === 'win32') {
    return {
      closeWorkerAfterMs: 10000,  // Longer on Windows
      retryFileOps: true
    };
  } else {
    return {
      closeWorkerAfterMs: 5000,
      retryFileOps: false
    };
  }
}
```

### Line Ending Normalization

**Ensure consistent line endings:**
```javascript
// When writing files
const content = workerTemplate.replace(/\r\n/g, '\n');
writeFileSync(path, content, 'utf8');

// Or use Git configuration
// .gitattributes
// *.mjs text eol=lf
// *.md text eol=lf
```

---

## Testing on Windows

### Environment Setup

**1. Install Node.js:**
```powershell
# Using winget
winget install OpenJS.NodeJS.LTS

# Or download from nodejs.org
```

**2. Install Git:**
```powershell
# Using winget
winget install Git.Git

# Configure
git config --global core.autocrlf true
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

**3. Clone Repository:**
```powershell
git clone https://github.com/your-org/gitvan.git
cd gitvan
```

**4. Install Dependencies:**
```powershell
npm install
```

### Running Tests on Windows

**Run full test suite:**
```powershell
npm test
```

**Run specific tests:**
```powershell
npm test tests/jobs-bree-integration.test.mjs
```

**Run with debug logging:**
```powershell
$env:DEBUG="gitvan:*"
npm test
```

**Check for Windows-specific failures:**
```powershell
npm test 2>&1 | Select-String "FAIL"
```

### Debugging on Windows

**PowerShell:**
```powershell
# Check Node version
node --version

# Check paths
Get-ChildItem -Path jobs -Recurse -Filter *.mjs

# Check worker files
Get-ChildItem -Path .gitvan/workers

# Monitor memory
$process = Get-Process -Name node
$process.WorkingSet64 / 1MB
```

**Node.js Inspector:**
```powershell
node --inspect app.mjs

# Then open: chrome://inspect
```

**Debug Specific Job:**
```javascript
// debug-job.mjs
import { withGitVan, useJob } from 'gitvan';

await withGitVan({ cwd: process.cwd() }, async () => {
  const job = useJob();

  console.log('Platform:', process.platform);
  console.log('CWD:', process.cwd());
  console.log('Env:', process.env);

  const result = await job.run('test-job');
  console.log('Result:', result);
});
```

```powershell
node debug-job.mjs
```

---

## Windows-Specific Configuration

### gitvan.config.js for Windows

```javascript
export default {
  jobs: {
    dir: 'jobs',

    // Longer worker cleanup on Windows
    closeWorkerAfterMs: process.platform === 'win32' ? 10000 : 5000,

    // Worker options
    workerOptions: {
      // Windows-specific resource limits
      resourceLimits: process.platform === 'win32' ? {
        maxOldGenerationSizeMb: 1024,
        maxYoungGenerationSizeMb: 128
      } : {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 64
      }
    }
  },

  // Platform-specific paths
  workerDir: process.platform === 'win32'
    ? '.gitvan\\workers'
    : '.gitvan/workers'
};
```

### Environment Variables (PowerShell)

```powershell
# Set environment variables
$env:NODE_ENV = "production"
$env:DEBUG = "gitvan:*"
$env:TZ = "UTC"

# Permanent (requires admin)
[System.Environment]::SetEnvironmentVariable('NODE_ENV', 'production', 'Machine')
```

### Path Configuration

**Ensure forward slashes in config:**
```javascript
export default {
  jobs: {
    // ✓ Use forward slashes (cross-platform)
    dir: 'jobs',
    dirs: ['jobs', 'custom-jobs'],

    // ✗ Avoid backslashes (Windows-only)
    // dir: 'jobs\\',  // Don't do this
  }
};
```

---

## Troubleshooting Windows Issues

### Issue: "Cannot find module" Error

**Symptoms:**
```
Error: Cannot find module 'C:\Users\...\jobs\backup-job.mjs'
```

**Causes:**
- Incorrect file:// URL
- Path escaping issues

**Solutions:**

1. **Check worker file:**
```powershell
Get-Content .gitvan\workers\backup-job-worker.mjs
```

2. **Verify file URL format:**
```javascript
// Should be: file:///C:/Users/path/to/job.mjs
// Not: file://C:\Users\path\to\job.mjs
```

3. **Regenerate worker file:**
```javascript
const job = useJob();
await job.unschedule('backup-job');
await job.schedule('backup-job');
```

### Issue: File Locking Errors

**Symptoms:**
```
Error: EBUSY: resource busy or locked
```

**Solutions:**

1. **Wait and retry:**
```powershell
# Stop all Node processes
Get-Process node | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Retry operation
npm test
```

2. **Check file handles:**
```powershell
# Using Handle tool from Sysinternals
handle.exe .gitvan\workers
```

3. **Disable antivirus temporarily:**
- Some antivirus software locks files
- Add `.gitvan/workers/` to exclusions

### Issue: Permission Denied

**Symptoms:**
```
Error: EPERM: operation not permitted
```

**Solutions:**

1. **Run as Administrator:**
```powershell
# Right-click PowerShell → Run as Administrator
```

2. **Check folder permissions:**
```powershell
icacls .gitvan\workers
```

3. **Grant permissions:**
```powershell
icacls .gitvan\workers /grant Users:F /t
```

### Issue: Line Ending Errors

**Symptoms:**
```
SyntaxError: Unexpected token
```

**Solutions:**

1. **Configure Git:**
```powershell
git config core.autocrlf true
```

2. **Add .gitattributes:**
```
*.mjs text eol=lf
*.js text eol=lf
*.md text eol=lf
```

3. **Convert existing files:**
```powershell
# Using dos2unix (if installed)
dos2unix jobs/**/*.mjs

# Or using PowerShell
Get-ChildItem -Path jobs -Filter *.mjs -Recurse | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "`r`n", "`n"
  Set-Content $_.FullName -Value $content -NoNewline
}
```

### Issue: Slow Performance

**Symptoms:**
- Jobs run slower on Windows
- High disk I/O

**Solutions:**

1. **Disable Windows Defender real-time scanning for project directory:**
```powershell
Add-MpPreference -ExclusionPath "C:\path\to\gitvan"
```

2. **Use SSD instead of HDD**

3. **Increase worker cleanup time:**
```javascript
export default {
  jobs: {
    closeWorkerAfterMs: 30000  // 30 seconds
  }
};
```

4. **Monitor performance:**
```powershell
# CPU usage
Get-Counter '\Processor(_Total)\% Processor Time'

# Disk I/O
Get-Counter '\PhysicalDisk(_Total)\Disk Reads/sec'
Get-Counter '\PhysicalDisk(_Total)\Disk Writes/sec'
```

---

## Windows Testing Checklist

- [ ] Node.js installed (LTS version)
- [ ] Git installed and configured
- [ ] Git configured with `core.autocrlf true`
- [ ] `.gitattributes` created with line ending rules
- [ ] Repository cloned successfully
- [ ] Dependencies installed (`npm install`)
- [ ] Tests pass (`npm test`)
- [ ] Job execution works
- [ ] Worker files generated correctly
- [ ] File:// URLs formatted correctly
- [ ] Lock system works
- [ ] Receipt system works
- [ ] Scheduler starts and stops
- [ ] Cleanup works properly
- [ ] No permission errors
- [ ] No file locking errors
- [ ] Performance acceptable

---

## See Also

- [Troubleshooting Guide](TROUBLESHOOTING-JOBS.md)
- [API Reference](api/job-scheduler.md)
- [Architecture Guide](ARCHITECTURE-BREE-INTEGRATION.md)
