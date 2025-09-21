# Troubleshooting

This chapter covers common issues and solutions when testing GitVan applications with `citty-test-utils`. Learn how to diagnose and fix problems quickly.

## Common Issues

### Installation Issues

#### Package Not Found

**Error:** `Cannot find module 'citty-test-utils'`

**Solutions:**
1. Verify installation:
   ```bash
   npm list citty-test-utils
   ```

2. Reinstall the package:
   ```bash
   npm uninstall citty-test-utils
   npm install citty-test-utils
   ```

3. Check npm registry:
   ```bash
   npm view citty-test-utils
   ```

#### Version Conflicts

**Error:** `Module version mismatch` or dependency conflicts

**Solutions:**
1. Check Node.js version:
   ```bash
   node --version  # Should be >= 18.0.0
   ```

2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

3. Use exact version:
   ```bash
   npm install citty-test-utils@0.2.3
   ```

#### Import Errors

**Error:** `SyntaxError: The requested module does not provide an export named 'runLocalCitty'`

**Solutions:**
1. Use correct import syntax:
   ```javascript
   import { runLocalCitty } from 'citty-test-utils'
   ```

2. Check if using CommonJS:
   ```javascript
   // Wrong
   const { runLocalCitty } = require('citty-test-utils')
   
   // Correct
   import { runLocalCitty } from 'citty-test-utils'
   ```

3. Verify package.json has `"type": "module"`

### Project Detection Problems

#### CLI Not Found

**Error:** `CLI not found at /path/to/src/cli.mjs`

**Solutions:**
1. Verify GitVan project structure:
   ```
   your-project/
   ├── src/
   │   └── cli.mjs
   ├── package.json
   └── node_modules/
   ```

2. Check package.json name:
   ```json
   {
     "name": "gitvan"
   }
   ```

3. Verify CLI file exists:
   ```bash
   ls -la src/cli.mjs
   ```

4. Test CLI manually:
   ```bash
   node src/cli.mjs --help
   ```

#### Wrong Project Root

**Error:** Tests run against wrong project

**Solutions:**
1. Specify working directory:
   ```javascript
   const result = await runLocalCitty(['--help'], {
     cwd: '/path/to/correct/project'
   })
   ```

2. Check current working directory:
   ```javascript
   console.log('Current directory:', process.cwd())
   ```

3. Use absolute paths:
   ```javascript
   const result = await runLocalCitty(['--help'], {
     cwd: path.resolve(__dirname, '..')
   })
   ```

#### Project Detection Loop

**Error:** Infinite loop when detecting project root

**Solutions:**
1. Check for circular symlinks:
   ```bash
   find . -type l -exec ls -la {} \;
   ```

2. Verify directory structure:
   ```bash
   tree -L 3
   ```

3. Use explicit project root:
   ```javascript
   const result = await runLocalCitty(['--help'], {
     cwd: '/explicit/path/to/gitvan/project'
   })
   ```

### Docker and Cleanroom Issues

#### Docker Not Available

**Error:** `Docker is not available. Please ensure Docker is installed and running.`

**Solutions:**
1. Check Docker installation:
   ```bash
   docker --version
   ```

2. Start Docker service:
   ```bash
   # macOS
   open -a Docker
   
   # Linux
   sudo systemctl start docker
   
   # Windows
   # Start Docker Desktop
   ```

3. Verify Docker daemon:
   ```bash
   docker ps
   ```

4. Check Docker permissions:
   ```bash
   docker run hello-world
   ```

#### Container Creation Failed

**Error:** `Failed to setup cleanroom: [error message]`

**Solutions:**
1. Check Docker image availability:
   ```bash
   docker pull node:20-alpine
   ```

2. Verify disk space:
   ```bash
   df -h
   ```

3. Check Docker logs:
   ```bash
   docker logs $(docker ps -q)
   ```

4. Try different image:
   ```javascript
   await setupCleanroom({
     nodeImage: 'node:18-alpine'
   })
   ```

#### Container Timeout

**Error:** `Container startup timed out`

**Solutions:**
1. Increase timeout:
   ```javascript
   await setupCleanroom({
     rootDir: '.',
     timeout: 60000  // 60 seconds
   })
   ```

2. Check system resources:
   ```bash
   top
   free -h
   ```

3. Use lighter image:
   ```javascript
   await setupCleanroom({
     nodeImage: 'node:18-alpine'
   })
   ```

#### Project Copy Issues

**Error:** `Failed to copy project to container`

**Solutions:**
1. Check project size:
   ```bash
   du -sh .
   ```

2. Exclude large directories:
   ```javascript
   await setupCleanroom({
     rootDir: '.',
     exclude: ['node_modules', '.git', 'dist']
   })
   ```

3. Use .dockerignore:
   ```
   node_modules
   .git
   dist
   coverage
   ```

### Command Execution Problems

#### Command Timeout

**Error:** `Command timed out after 30000ms`

**Solutions:**
1. Increase timeout:
   ```javascript
   const result = await runLocalCitty(['long-command'], {
     timeout: 120000  // 2 minutes
   })
   ```

2. Optimize command:
   ```javascript
   const result = await runLocalCitty(['--help'])  // Faster command
   ```

3. Use background execution:
   ```javascript
   const result = await runLocalCitty(['daemon', 'start'], {
     timeout: 0  // No timeout
   })
   ```

#### Process Spawn Failed

**Error:** `Process spawn failed: [error message]`

**Solutions:**
1. Check Node.js installation:
   ```bash
   which node
   node --version
   ```

2. Verify file permissions:
   ```bash
   ls -la src/cli.mjs
   chmod +x src/cli.mjs
   ```

3. Check working directory:
   ```bash
   pwd
   ls -la
   ```

#### Environment Variables

**Error:** Command fails due to missing environment variables

**Solutions:**
1. Pass environment variables:
   ```javascript
   const result = await runLocalCitty(['command'], {
     env: {
       NODE_ENV: 'test',
       DEBUG: 'true',
       PATH: process.env.PATH
     }
   })
   ```

2. Inherit all environment:
   ```javascript
   const result = await runLocalCitty(['command'], {
     env: { ...process.env, CUSTOM_VAR: 'value' }
   })
   ```

#### Permission Denied

**Error:** `Permission denied` or `EACCES`

**Solutions:**
1. Check file permissions:
   ```bash
   ls -la src/cli.mjs
   chmod +x src/cli.mjs
   ```

2. Check directory permissions:
   ```bash
   ls -la .
   chmod 755 .
   ```

3. Run with appropriate user:
   ```bash
   sudo chown -R $USER:$USER .
   ```

### Assertion Failures

#### Output Mismatch

**Error:** `Expected stdout to match USAGE, got: [actual output]`

**Solutions:**
1. Check actual output:
   ```javascript
   const result = await runLocalCitty(['--help'])
   console.log('Actual output:', result.result.stdout)
   ```

2. Use case-insensitive matching:
   ```javascript
   result.expectOutput(/usage/i)  // Case insensitive
   ```

3. Check for partial matches:
   ```javascript
   result.expectOutputContains('USAGE')
   ```

#### Exit Code Issues

**Error:** `Expected exit code 0, got 1`

**Solutions:**
1. Check command validity:
   ```bash
   node src/cli.mjs --help
   ```

2. Handle expected failures:
   ```javascript
   const result = await runLocalCitty(['invalid-command'])
   result.expectFailure()  // Expect non-zero exit code
   ```

3. Check for specific exit codes:
   ```javascript
   result.expectExitCodeIn([0, 1, 2])  // Accept multiple codes
   ```

#### JSON Parsing Errors

**Error:** `JSON parsing failed` or `expectJson` fails

**Solutions:**
1. Check if command outputs JSON:
   ```javascript
   const result = await runLocalCitty(['--version'], { json: true })
   console.log('JSON output:', result.result.json)
   ```

2. Use safe JSON parsing:
   ```javascript
   if (result.result.json) {
     result.expectJson(data => {
       expect(data.version).toBeDefined()
     })
   }
   ```

3. Handle non-JSON commands:
   ```javascript
   const result = await runLocalCitty(['--help'])  // Don't use json: true
   ```

### Performance Issues

#### Slow Test Execution

**Symptoms:** Tests take too long to run

**Solutions:**
1. Use local runner instead of cleanroom:
   ```javascript
   const result = await runLocalCitty(['--help'])  // Faster
   // Instead of cleanroom for simple tests
   ```

2. Optimize test commands:
   ```javascript
   const result = await runLocalCitty(['--version'])  // Very fast
   ```

3. Use parallel execution:
   ```javascript
   const promises = [
     runLocalCitty(['--help']),
     runLocalCitty(['--version']),
     runLocalCitty(['status'])
   ]
   const results = await Promise.all(promises)
   ```

#### Memory Issues

**Error:** `JavaScript heap out of memory`

**Solutions:**
1. Increase Node.js memory:
   ```bash
   node --max-old-space-size=4096 test.mjs
   ```

2. Clean up resources:
   ```javascript
   await teardownCleanroom()  // Clean up containers
   ```

3. Use fewer concurrent tests:
   ```javascript
   // Run tests sequentially instead of parallel
   for (const test of tests) {
     await test()
   }
   ```

#### Container Resource Issues

**Error:** Container runs out of resources

**Solutions:**
1. Use smaller base image:
   ```javascript
   await setupCleanroom({
     nodeImage: 'node:18-alpine'  // Smaller than node:20
   })
   ```

2. Limit container resources:
   ```javascript
   // This would require custom testcontainers configuration
   ```

3. Clean up containers regularly:
   ```javascript
   await teardownCleanroom()
   ```

### Environment Issues

#### Different Behavior Across Environments

**Symptoms:** Tests pass locally but fail in CI/CD

**Solutions:**
1. Use consistent Node.js version:
   ```bash
   nvm use 18
   ```

2. Check environment differences:
   ```javascript
   console.log('Environment:', process.env.NODE_ENV)
   console.log('Platform:', process.platform)
   ```

3. Use environment-specific configurations:
   ```javascript
   const config = {
     development: { timeout: 30000 },
     production: { timeout: 60000 },
     ci: { timeout: 120000 }
   }
   
   const result = await runLocalCitty(['command'], config[process.env.NODE_ENV])
   ```

#### Path Issues

**Error:** `ENOENT: no such file or directory`

**Solutions:**
1. Use absolute paths:
   ```javascript
   import { resolve } from 'path'
   
   const result = await runLocalCitty(['command'], {
     cwd: resolve(__dirname, '..')
   })
   ```

2. Check path separators:
   ```javascript
   import { join } from 'path'
   
   const cliPath = join(process.cwd(), 'src', 'cli.mjs')
   ```

3. Verify file existence:
   ```javascript
   import { existsSync } from 'fs'
   
   if (!existsSync('src/cli.mjs')) {
     throw new Error('CLI not found')
   }
   ```

## Debugging Techniques

### Enable Verbose Logging

```javascript
// Add debug logging
const result = await runLocalCitty(['--help'])
console.log('Command:', result.result.args)
console.log('Working directory:', result.result.cwd)
console.log('Exit code:', result.result.exitCode)
console.log('Stdout:', result.result.stdout)
console.log('Stderr:', result.result.stderr)
```

### Use Debug Mode

```javascript
// Enable debug mode
process.env.DEBUG = 'citty-test-utils'

const result = await runLocalCitty(['--help'])
```

### Test Individual Components

```javascript
// Test project detection
import { findGitVanProject } from 'citty-test-utils'

const projectRoot = await findGitVanProject(process.cwd())
console.log('Project root:', projectRoot)

// Test CLI directly
import { spawn } from 'child_process'

const proc = spawn('node', ['src/cli.mjs', '--help'], {
  cwd: projectRoot
})

proc.stdout.on('data', (data) => {
  console.log('CLI output:', data.toString())
})
```

### Common Debug Commands

```bash
# Check GitVan CLI directly
node src/cli.mjs --help

# Check project structure
ls -la src/
cat package.json | grep name

# Check Docker
docker --version
docker ps

# Check Node.js
node --version
npm --version

# Check environment
echo $NODE_ENV
echo $PATH
```

## Error Message Reference

### Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Cannot find module 'citty-test-utils'` | Package not installed | Run `npm install citty-test-utils` |
| `CLI not found at /path/to/src/cli.mjs` | Wrong project structure | Check GitVan project setup |
| `Docker is not available` | Docker not running | Start Docker service |
| `Command timed out after 30000ms` | Command too slow | Increase timeout or optimize command |
| `Expected stdout to match USAGE, got: [output]` | Output mismatch | Check actual output and adjust assertion |
| `Process spawn failed` | Node.js or file issues | Check Node.js installation and permissions |

### Error Code Reference

| Exit Code | Meaning | Common Causes |
|-----------|---------|---------------|
| 0 | Success | Command executed successfully |
| 1 | General error | Invalid arguments, missing files |
| 2 | Misuse of shell builtins | Shell command issues |
| 126 | Command invoked cannot execute | Permission issues |
| 127 | Command not found | Command doesn't exist |
| 128 | Invalid exit argument | Exit code out of range |

## Getting Help

### Self-Help Checklist

1. **Check the logs** - Look for detailed error messages
2. **Verify prerequisites** - Ensure all requirements are met
3. **Test manually** - Run commands manually to isolate issues
4. **Check versions** - Ensure compatible versions of all tools
5. **Search issues** - Look for similar issues in the repository
6. **Create minimal reproduction** - Create a simple test case that reproduces the issue

### Reporting Issues

When reporting issues, include:

1. **Node.js version**: `node --version`
2. **Package version**: `npm list citty-test-utils`
3. **Operating system**: `uname -a` or `systeminfo`
4. **Error message**: Complete error output
5. **Reproduction steps**: Minimal code to reproduce the issue
6. **Expected behavior**: What should happen
7. **Actual behavior**: What actually happens

### Community Resources

- **GitHub Issues**: [Report bugs and request features](https://github.com/seanchatmangpt/gitvan/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/seanchatmangpt/gitvan/discussions)
- **Documentation**: [Complete API reference](https://github.com/seanchatmangpt/gitvan/tree/main/vendors/citty-test-utils/docs)

## Prevention Strategies

### Best Practices

1. **Test early and often** - Catch issues before they become problems
2. **Use consistent environments** - Same Node.js version across environments
3. **Keep dependencies updated** - Regular updates prevent compatibility issues
4. **Write robust tests** - Handle edge cases and error conditions
5. **Monitor performance** - Track test execution times and resource usage

### Proactive Monitoring

```javascript
// Monitor test performance
const startTime = Date.now()
const result = await runLocalCitty(['--help'])
const duration = Date.now() - startTime

if (duration > 5000) {
  console.warn(`Test took ${duration}ms, consider optimization`)
}
```

### Regular Maintenance

```bash
# Regular maintenance tasks
npm update                    # Update dependencies
npm audit                    # Check for security issues
npm run test:coverage        # Check test coverage
npm run test:performance     # Check performance
```

## Summary

Troubleshooting GitVan testing issues requires:

1. **Systematic approach** - Check prerequisites, logs, and environment
2. **Common solutions** - Most issues have well-known solutions
3. **Debugging tools** - Use logging, debugging, and manual testing
4. **Community support** - Leverage GitHub issues and discussions
5. **Prevention** - Follow best practices to avoid common issues

Most issues can be resolved by:
- Checking prerequisites and versions
- Verifying project structure
- Using appropriate timeouts and configurations
- Following best practices

For comprehensive testing strategies, see [Best Practices](./best-practices.md).

---

**Ready for best practices?** Let's explore [Best Practices](./best-practices.md)!
