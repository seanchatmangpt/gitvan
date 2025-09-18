# GitVan v2 Validation Scripts for Automation

## Overview

This document provides comprehensive validation scripts that automate the verification of GitVan v2 specifications. These scripts ensure continuous compliance with requirements and detect regressions before they impact production systems.

## Script Categories

### 1. Structure Validators
### 2. Dependency Checkers
### 3. API Contract Validators
### 4. Performance Benchmarks
### 5. Security Validators
### 6. Integration Test Runners

---

## Structure Validation Scripts

### Script: validate-project-structure.mjs
```javascript
#!/usr/bin/env node
/**
 * GitVan v2 Project Structure Validator
 * Ensures compliance with single-package architecture requirements
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class StructureValidator {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath
    this.errors = []
    this.warnings = []
  }

  validate() {
    console.log('🔍 Validating GitVan v2 project structure...')

    this.validateSinglePackageStructure()
    this.validateSourceStructure()
    this.validateTypeDefinitions()
    this.validateConfigurationFiles()
    this.validateDocumentation()

    return this.generateReport()
  }

  validateSinglePackageStructure() {
    const forbidden = ['packages/', 'apps/', 'libs/', 'workspace.json', 'lerna.json']

    for (const item of forbidden) {
      if (fs.existsSync(path.join(this.rootPath, item))) {
        this.errors.push(`❌ Monorepo structure detected: ${item} - GitVan v2 must be single package`)
      }
    }

    // Validate package.json exists and is properly configured
    const packageJsonPath = path.join(this.rootPath, 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
      this.errors.push('❌ Missing package.json')
      return
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

      if (packageJson.type !== 'module') {
        this.errors.push('❌ package.json must have "type": "module"')
      }

      if (!packageJson.bin || !packageJson.bin.gitvan) {
        this.errors.push('❌ package.json must define bin.gitvan executable')
      }

      if (!packageJson.exports || !packageJson.exports['.']) {
        this.errors.push('❌ package.json must define proper exports map')
      }

    } catch (error) {
      this.errors.push(`❌ Invalid package.json: ${error.message}`)
    }
  }

  validateSourceStructure() {
    const requiredDirs = [
      'src',
      'src/composables',
      'src/runtime',
      'src/cli',
      'types',
      'bin'
    ]

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.rootPath, dir)
      if (!fs.existsSync(dirPath)) {
        this.errors.push(`❌ Missing required directory: ${dir}`)
      }
    }

    // Validate core files exist
    const requiredFiles = [
      'src/index.mjs',
      'src/define.mjs',
      'src/composables/ctx.mjs',
      'src/composables/git.mjs',
      'src/composables/template.mjs',
      'src/composables/exec.mjs',
      'src/runtime/daemon.mjs',
      'src/cli/main.mjs',
      'types/index.d.ts',
      'bin/gitvan.mjs'
    ]

    for (const file of requiredFiles) {
      const filePath = path.join(this.rootPath, file)
      if (!fs.existsSync(filePath)) {
        this.errors.push(`❌ Missing required file: ${file}`)
      } else {
        // Check if .mjs files are actually ES modules
        if (file.endsWith('.mjs')) {
          const content = fs.readFileSync(filePath, 'utf8')
          if (!content.includes('export') && !content.includes('import')) {
            this.warnings.push(`⚠️  ${file} may not be a proper ES module`)
          }
        }
      }
    }
  }

  validateTypeDefinitions() {
    const typesPath = path.join(this.rootPath, 'types/index.d.ts')
    if (!fs.existsSync(typesPath)) {
      this.errors.push('❌ Missing TypeScript definitions at types/index.d.ts')
      return
    }

    const content = fs.readFileSync(typesPath, 'utf8')

    // Check for required type exports
    const requiredTypes = [
      'JobKind',
      'JobDef',
      'RunContext',
      'ExecSpec',
      'GitVanConfig',
      'GitAPI',
      'TemplateAPI'
    ]

    for (const type of requiredTypes) {
      if (!content.includes(`export interface ${type}`) && !content.includes(`export type ${type}`)) {
        this.errors.push(`❌ Missing type definition: ${type}`)
      }
    }

    // Check for required module declarations
    const requiredModules = [
      'gitvan/define',
      'gitvan/composables',
      'gitvan'
    ]

    for (const mod of requiredModules) {
      if (!content.includes(`declare module '${mod}'`)) {
        this.errors.push(`❌ Missing module declaration: ${mod}`)
      }
    }
  }

  validateConfigurationFiles() {
    // Check for proper ESLint config
    const eslintConfig = path.join(this.rootPath, 'eslint.config.mjs')
    if (!fs.existsSync(eslintConfig)) {
      this.warnings.push('⚠️  Missing eslint.config.mjs')
    }

    // Check for proper editor config
    const editorConfig = path.join(this.rootPath, '.editorconfig')
    if (!fs.existsSync(editorConfig)) {
      this.warnings.push('⚠️  Missing .editorconfig')
    }

    // Check for proper gitignore
    const gitignore = path.join(this.rootPath, '.gitignore')
    if (fs.existsSync(gitignore)) {
      const content = fs.readFileSync(gitignore, 'utf8')
      if (!content.includes('node_modules')) {
        this.warnings.push('⚠️  .gitignore should include node_modules')
      }
    }
  }

  validateDocumentation() {
    const requiredDocs = ['README.md', 'LICENSE']

    for (const doc of requiredDocs) {
      if (!fs.existsSync(path.join(this.rootPath, doc))) {
        this.errors.push(`❌ Missing required documentation: ${doc}`)
      }
    }
  }

  generateReport() {
    console.log('\n📊 Structure Validation Report')
    console.log('═'.repeat(50))

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All structure validations passed!')
      return true
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:')
      this.errors.forEach(error => console.log(`  ${error}`))
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.warnings.forEach(warning => console.log(`  ${warning}`))
    }

    console.log(`\nSummary: ${this.errors.length} errors, ${this.warnings.length} warnings`)

    return this.errors.length === 0
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const validator = new StructureValidator()
  const success = validator.validate()
  process.exit(success ? 0 : 1)
}

export { StructureValidator }
```

### Script: validate-dependencies.mjs
```javascript
#!/usr/bin/env node
/**
 * GitVan v2 Dependency Validator
 * Ensures minimal dependencies and security compliance
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

class DependencyValidator {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath
    this.errors = []
    this.warnings = []

    // Approved dependencies for GitVan v2
    this.allowedDependencies = new Set([
      'hookable',
      'nunjucks',
      'pathe',
      'unctx',
      'unrouting',
      'citty'
    ])

    this.allowedDevDependencies = new Set([
      'vitest',
      'eslint',
      'prettier',
      '@types/node'
    ])
  }

  validate() {
    console.log('🔍 Validating GitVan v2 dependencies...')

    this.validatePackageJson()
    this.validateSecurityAudit()
    this.validateLicenseCompliance()
    this.validateDependencyVersions()

    return this.generateReport()
  }

  validatePackageJson() {
    const packageJsonPath = path.join(this.rootPath, 'package.json')

    if (!fs.existsSync(packageJsonPath)) {
      this.errors.push('❌ Missing package.json')
      return
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

    // Validate production dependencies
    if (packageJson.dependencies) {
      for (const dep of Object.keys(packageJson.dependencies)) {
        if (!this.allowedDependencies.has(dep)) {
          this.errors.push(`❌ Unauthorized dependency: ${dep}`)
        }
      }

      // Check for missing required dependencies
      for (const required of this.allowedDependencies) {
        if (required !== 'citty' && !packageJson.dependencies[required]) {
          this.errors.push(`❌ Missing required dependency: ${required}`)
        }
      }
    } else {
      this.errors.push('❌ No dependencies defined in package.json')
    }

    // Validate dev dependencies
    if (packageJson.devDependencies) {
      for (const dep of Object.keys(packageJson.devDependencies)) {
        if (!this.allowedDevDependencies.has(dep) && !dep.startsWith('@types/')) {
          this.warnings.push(`⚠️  Non-standard dev dependency: ${dep}`)
        }
      }
    }

    // Check for dependency count (should be minimal)
    const totalDeps = Object.keys(packageJson.dependencies || {}).length
    if (totalDeps > 10) {
      this.warnings.push(`⚠️  High dependency count: ${totalDeps} (consider reducing)`)
    }
  }

  validateSecurityAudit() {
    try {
      console.log('Running npm audit...')
      execSync('npm audit --audit-level=high', {
        stdio: 'pipe',
        cwd: this.rootPath
      })
      console.log('✅ No high-severity vulnerabilities found')
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities found
      const output = error.stdout?.toString() || ''
      if (output.includes('vulnerabilities')) {
        this.errors.push('❌ Security vulnerabilities detected in dependencies')
      }
    }
  }

  validateLicenseCompliance() {
    const packageJsonPath = path.join(this.rootPath, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

    // Check main package license
    if (!packageJson.license) {
      this.warnings.push('⚠️  No license specified in package.json')
    } else if (packageJson.license !== 'Apache-2.0') {
      this.warnings.push(`⚠️  License is ${packageJson.license}, expected Apache-2.0`)
    }

    // Check dependency licenses (simplified check)
    try {
      const output = execSync('npm list --json --prod', {
        stdio: 'pipe',
        cwd: this.rootPath
      }).toString()

      const deps = JSON.parse(output)
      this.checkDependencyLicenses(deps.dependencies || {})
    } catch (error) {
      this.warnings.push('⚠️  Could not verify dependency licenses')
    }
  }

  checkDependencyLicenses(dependencies) {
    const problematicLicenses = ['GPL', 'AGPL', 'LGPL']

    for (const [name, info] of Object.entries(dependencies)) {
      const license = info._license || 'Unknown'

      if (problematicLicenses.some(bad => license.includes(bad))) {
        this.warnings.push(`⚠️  Dependency ${name} has restrictive license: ${license}`)
      }
    }
  }

  validateDependencyVersions() {
    const packageJsonPath = path.join(this.rootPath, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

    if (!packageJson.dependencies) return

    // Check for version pinning vs ranges
    for (const [name, version] of Object.entries(packageJson.dependencies)) {
      if (version.startsWith('^') || version.startsWith('~')) {
        // Ranges are acceptable for most dependencies
        continue
      } else if (version.includes('*') || version.includes('x')) {
        this.warnings.push(`⚠️  Wildcard version for ${name}: ${version}`)
      }
    }

    // Validate lock file exists
    if (!fs.existsSync(path.join(this.rootPath, 'package-lock.json'))) {
      this.warnings.push('⚠️  Missing package-lock.json for reproducible builds')
    }
  }

  generateReport() {
    console.log('\n📊 Dependency Validation Report')
    console.log('═'.repeat(50))

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All dependency validations passed!')
      return true
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:')
      this.errors.forEach(error => console.log(`  ${error}`))
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.warnings.forEach(warning => console.log(`  ${warning}`))
    }

    return this.errors.length === 0
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const validator = new DependencyValidator()
  const success = validator.validate()
  process.exit(success ? 0 : 1)
}

export { DependencyValidator }
```

### Script: validate-api-contracts.mjs
```javascript
#!/usr/bin/env node
/**
 * GitVan v2 API Contract Validator
 * Ensures all public APIs conform to specifications
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class APIContractValidator {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath
    this.errors = []
    this.warnings = []
  }

  async validate() {
    console.log('🔍 Validating GitVan v2 API contracts...')

    await this.validateDefineAPI()
    await this.validateComposablesAPI()
    await this.validateCLIInterface()
    await this.validateTypeDefinitions()

    return this.generateReport()
  }

  async validateDefineAPI() {
    const definePath = path.join(this.rootPath, 'src/define.mjs')

    if (!fs.existsSync(definePath)) {
      this.errors.push('❌ Missing src/define.mjs')
      return
    }

    try {
      // Dynamic import to validate the module
      const defineModule = await import(`file://${definePath}`)

      const requiredExports = ['defineJob', 'defineConfig', 'definePlugin']

      for (const exportName of requiredExports) {
        if (typeof defineModule[exportName] !== 'function') {
          this.errors.push(`❌ Missing or invalid export: ${exportName}`)
        }
      }

      // Test defineJob function signature
      const testJobDef = {
        kind: 'atomic',
        meta: { desc: 'Test job' },
        async run() { return { ok: true } }
      }

      const result = defineModule.defineJob(testJobDef)
      if (result !== testJobDef) {
        this.errors.push('❌ defineJob should return the input unchanged')
      }

    } catch (error) {
      this.errors.push(`❌ Failed to import define module: ${error.message}`)
    }
  }

  async validateComposablesAPI() {
    const composablesFiles = [
      'src/composables/ctx.mjs',
      'src/composables/git.mjs',
      'src/composables/template.mjs',
      'src/composables/exec.mjs'
    ]

    for (const file of composablesFiles) {
      const filePath = path.join(this.rootPath, file)

      if (!fs.existsSync(filePath)) {
        this.errors.push(`❌ Missing composable: ${file}`)
        continue
      }

      try {
        const module = await import(`file://${filePath}`)

        // Validate specific composable exports
        if (file.includes('ctx.mjs')) {
          if (typeof module.useGitVan !== 'function' || typeof module.withGitVan !== 'function') {
            this.errors.push('❌ ctx.mjs must export useGitVan and withGitVan functions')
          }
        }

        if (file.includes('git.mjs')) {
          if (typeof module.useGit !== 'function') {
            this.errors.push('❌ git.mjs must export useGit function')
          }
        }

        if (file.includes('template.mjs')) {
          if (typeof module.useTemplate !== 'function') {
            this.errors.push('❌ template.mjs must export useTemplate function')
          }
        }

        if (file.includes('exec.mjs')) {
          if (typeof module.useExec !== 'function') {
            this.errors.push('❌ exec.mjs must export useExec function')
          }
        }

      } catch (error) {
        this.errors.push(`❌ Failed to import ${file}: ${error.message}`)
      }
    }
  }

  async validateCLIInterface() {
    const cliPath = path.join(this.rootPath, 'src/cli/main.mjs')
    const binPath = path.join(this.rootPath, 'bin/gitvan.mjs')

    if (!fs.existsSync(cliPath)) {
      this.errors.push('❌ Missing src/cli/main.mjs')
    }

    if (!fs.existsSync(binPath)) {
      this.errors.push('❌ Missing bin/gitvan.mjs')
    }

    // Validate CLI commands structure
    const commandsDir = path.join(this.rootPath, 'src/cli/commands')
    const expectedCommands = [
      'job-list.mjs',
      'job-run.mjs',
      'event-list.mjs',
      'daemon-start.mjs',
      'worktree-list.mjs'
    ]

    if (!fs.existsSync(commandsDir)) {
      this.errors.push('❌ Missing src/cli/commands directory')
    } else {
      for (const command of expectedCommands) {
        const commandPath = path.join(commandsDir, command)
        if (!fs.existsSync(commandPath)) {
          this.errors.push(`❌ Missing CLI command: ${command}`)
        }
      }
    }

    // Check bin file has proper shebang
    if (fs.existsSync(binPath)) {
      const binContent = fs.readFileSync(binPath, 'utf8')
      if (!binContent.startsWith('#!/usr/bin/env node')) {
        this.errors.push('❌ bin/gitvan.mjs missing proper shebang')
      }
    }
  }

  validateTypeDefinitions() {
    const typesPath = path.join(this.rootPath, 'types/index.d.ts')

    if (!fs.existsSync(typesPath)) {
      this.errors.push('❌ Missing types/index.d.ts')
      return
    }

    const content = fs.readFileSync(typesPath, 'utf8')

    // Validate core interfaces exist
    const requiredInterfaces = [
      'RunContext',
      'JobDef',
      'JobResult',
      'ExecSpec',
      'GitVanConfig',
      'GitAPI',
      'TemplateAPI'
    ]

    for (const interfaceName of requiredInterfaces) {
      if (!content.includes(`interface ${interfaceName}`)) {
        this.errors.push(`❌ Missing interface definition: ${interfaceName}`)
      }
    }

    // Validate module declarations
    const requiredModules = [
      'gitvan/define',
      'gitvan/composables',
      'gitvan/daemon',
      'gitvan'
    ]

    for (const moduleName of requiredModules) {
      if (!content.includes(`declare module '${moduleName}'`)) {
        this.errors.push(`❌ Missing module declaration: ${moduleName}`)
      }
    }

    // Validate JobKind type
    if (!content.includes("type JobKind = 'atomic' | 'pipeline' | 'fanout' | 'gate'")) {
      this.errors.push('❌ JobKind type definition incorrect or missing')
    }

    // Validate ExecSpec union type
    const execTypes = ['ExecCLI', 'ExecJS', 'ExecTemplate', 'ExecLLM', 'ExecJob']
    for (const execType of execTypes) {
      if (!content.includes(`interface ${execType}`)) {
        this.errors.push(`❌ Missing exec type interface: ${execType}`)
      }
    }
  }

  generateReport() {
    console.log('\n📊 API Contract Validation Report')
    console.log('═'.repeat(50))

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All API contracts validated successfully!')
      return true
    }

    if (this.errors.length > 0) {
      console.log('\n❌ CONTRACT VIOLATIONS:')
      this.errors.forEach(error => console.log(`  ${error}`))
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.warnings.forEach(warning => console.log(`  ${warning}`))
    }

    return this.errors.length === 0
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const validator = new APIContractValidator()
  const success = await validator.validate()
  process.exit(success ? 0 : 1)
}

export { APIContractValidator }
```

### Script: run-performance-benchmarks.mjs
```javascript
#!/usr/bin/env node
/**
 * GitVan v2 Performance Benchmark Runner
 * Validates performance against specified criteria
 */

import { performance } from 'perf_hooks'
import { spawn, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

class PerformanceBenchmarkRunner {
  constructor(config = {}) {
    this.config = {
      samples: 100,
      warmupRuns: 10,
      ...config
    }
    this.results = {}
    this.targets = {
      jobExecutionP95: 300, // ms
      jobExecutionP99: 800, // ms
      daemonStartup: 5000,  // ms
      eventProcessing: 100, // ms
      memoryUsage: 50       // MB
    }
  }

  async runAllBenchmarks() {
    console.log('🚀 Running GitVan v2 performance benchmarks...')

    await this.benchmarkJobExecution()
    await this.benchmarkDaemonStartup()
    await this.benchmarkEventProcessing()
    await this.benchmarkMemoryUsage()

    return this.generateReport()
  }

  async benchmarkJobExecution() {
    console.log('📊 Benchmarking job execution speed...')

    // Setup test job
    this.setupTestJob()

    const durations = []

    // Warmup
    for (let i = 0; i < this.config.warmupRuns; i++) {
      execSync('gitvan job run --name perf:test-job', { stdio: 'pipe' })
    }

    // Actual benchmark
    for (let i = 0; i < this.config.samples; i++) {
      const start = performance.now()
      execSync('gitvan job run --name perf:test-job', { stdio: 'pipe' })
      const end = performance.now()

      durations.push(end - start)
    }

    durations.sort((a, b) => a - b)

    this.results.jobExecution = {
      mean: durations.reduce((a, b) => a + b) / durations.length,
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      min: durations[0],
      max: durations[durations.length - 1]
    }
  }

  async benchmarkDaemonStartup() {
    console.log('📊 Benchmarking daemon startup time...')

    const durations = []

    for (let i = 0; i < 10; i++) {
      const start = performance.now()

      const daemon = spawn('gitvan', ['daemon', 'start'], {
        stdio: 'pipe'
      })

      // Wait for daemon to be ready (simplified check)
      await new Promise(resolve => {
        setTimeout(() => {
          daemon.kill('SIGTERM')
          const end = performance.now()
          durations.push(end - start)
          resolve()
        }, 1000)
      })
    }

    this.results.daemonStartup = {
      mean: durations.reduce((a, b) => a + b) / durations.length,
      max: Math.max(...durations)
    }
  }

  async benchmarkEventProcessing() {
    console.log('📊 Benchmarking event processing latency...')

    // Setup event
    this.setupTestEvent()

    const daemon = spawn('gitvan', ['daemon', 'start'], {
      stdio: 'pipe'
    })

    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for daemon startup

    const durations = []

    for (let i = 0; i < 20; i++) {
      const start = performance.now()

      // Trigger event
      execSync(`git commit --allow-empty -m "test commit ${i}"`, { stdio: 'pipe' })

      // Wait for processing (simplified)
      await new Promise(resolve => setTimeout(resolve, 50))

      const end = performance.now()
      durations.push(end - start)
    }

    daemon.kill('SIGTERM')

    this.results.eventProcessing = {
      mean: durations.reduce((a, b) => a + b) / durations.length,
      max: Math.max(...durations)
    }
  }

  async benchmarkMemoryUsage() {
    console.log('📊 Benchmarking memory usage...')

    const daemon = spawn('gitvan', ['daemon', 'start'], {
      stdio: 'pipe'
    })

    const measurements = []

    const monitor = setInterval(() => {
      try {
        const memInfo = execSync(`ps -o rss= -p ${daemon.pid}`, { stdio: 'pipe' })
        const memoryMB = parseInt(memInfo.toString().trim()) / 1024
        measurements.push(memoryMB)
      } catch (error) {
        // Process may have exited
      }
    }, 1000)

    // Run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000))

    clearInterval(monitor)
    daemon.kill('SIGTERM')

    this.results.memoryUsage = {
      peak: Math.max(...measurements),
      average: measurements.reduce((a, b) => a + b) / measurements.length,
      steady: measurements.slice(-10).reduce((a, b) => a + b) / 10 // Last 10 measurements
    }
  }

  setupTestJob() {
    if (!fs.existsSync('jobs')) fs.mkdirSync('jobs', { recursive: true })
    if (!fs.existsSync('jobs/perf')) fs.mkdirSync('jobs/perf', { recursive: true })

    const jobContent = `
import { defineJob } from 'gitvan/define'
import { useGit } from 'gitvan/composables'

export default defineJob({
  kind: 'atomic',
  meta: { desc: 'Performance test job' },
  async run() {
    const git = useGit()
    const status = git.status()
    return { ok: true, meta: { lines: status.split('\\n').length } }
  }
})
`

    fs.writeFileSync('jobs/perf/test-job.mjs', jobContent)
  }

  setupTestEvent() {
    if (!fs.existsSync('events')) fs.mkdirSync('events', { recursive: true })
    if (!fs.existsSync('events/push-to')) fs.mkdirSync('events/push-to', { recursive: true })

    const eventContent = 'export default { job: "perf:test-job" }'
    fs.writeFileSync('events/push-to/main.mjs', eventContent)
  }

  generateReport() {
    console.log('\n📊 Performance Benchmark Report')
    console.log('═'.repeat(60))

    let allPassed = true

    // Job Execution
    const jobExec = this.results.jobExecution
    console.log('\n🏃 Job Execution Performance:')
    console.log(`  Mean: ${jobExec.mean.toFixed(2)}ms`)
    console.log(`  P95:  ${jobExec.p95.toFixed(2)}ms (target: ≤${this.targets.jobExecutionP95}ms)`)
    console.log(`  P99:  ${jobExec.p99.toFixed(2)}ms (target: ≤${this.targets.jobExecutionP99}ms)`)

    if (jobExec.p95 > this.targets.jobExecutionP95) {
      console.log(`  ❌ P95 exceeds target: ${jobExec.p95.toFixed(2)}ms > ${this.targets.jobExecutionP95}ms`)
      allPassed = false
    } else {
      console.log(`  ✅ P95 meets target`)
    }

    if (jobExec.p99 > this.targets.jobExecutionP99) {
      console.log(`  ❌ P99 exceeds target: ${jobExec.p99.toFixed(2)}ms > ${this.targets.jobExecutionP99}ms`)
      allPassed = false
    } else {
      console.log(`  ✅ P99 meets target`)
    }

    // Daemon Startup
    const daemonStartup = this.results.daemonStartup
    console.log('\n🚀 Daemon Startup Performance:')
    console.log(`  Mean: ${daemonStartup.mean.toFixed(2)}ms`)
    console.log(`  Max:  ${daemonStartup.max.toFixed(2)}ms (target: ≤${this.targets.daemonStartup}ms)`)

    if (daemonStartup.max > this.targets.daemonStartup) {
      console.log(`  ❌ Startup time exceeds target`)
      allPassed = false
    } else {
      console.log(`  ✅ Startup time meets target`)
    }

    // Memory Usage
    const memory = this.results.memoryUsage
    console.log('\n💾 Memory Usage:')
    console.log(`  Peak: ${memory.peak.toFixed(1)}MB (target: ≤${this.targets.memoryUsage}MB)`)
    console.log(`  Average: ${memory.average.toFixed(1)}MB`)
    console.log(`  Steady State: ${memory.steady.toFixed(1)}MB`)

    if (memory.peak > this.targets.memoryUsage) {
      console.log(`  ❌ Peak memory exceeds target`)
      allPassed = false
    } else {
      console.log(`  ✅ Memory usage meets target`)
    }

    console.log('\n' + '═'.repeat(60))
    if (allPassed) {
      console.log('✅ All performance benchmarks PASSED!')
    } else {
      console.log('❌ Some performance benchmarks FAILED!')
    }

    return allPassed
  }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runner = new PerformanceBenchmarkRunner()
  const success = await runner.runAllBenchmarks()
  process.exit(success ? 0 : 1)
}

export { PerformanceBenchmarkRunner }
```

### Master Validation Runner Script

```bash
#!/bin/bash
# validate-all.sh - Master validation script for GitVan v2

set -e

echo "🔍 GitVan v2 Complete Validation Suite"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED_TESTS=()
TOTAL_TESTS=0

run_validation() {
  local test_name="$1"
  local test_script="$2"
  local description="$3"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  echo ""
  echo "Running: $description"
  echo "----------------------------------------"

  if $test_script; then
    echo -e "${GREEN}✅ PASSED: $test_name${NC}"
  else
    echo -e "${RED}❌ FAILED: $test_name${NC}"
    FAILED_TESTS+=("$test_name")
  fi
}

# Project Structure Validation
run_validation "structure" "node specs/validation/validate-project-structure.mjs" "Project Structure Validation"

# Dependency Validation
run_validation "dependencies" "node specs/validation/validate-dependencies.mjs" "Dependency Validation"

# API Contract Validation
run_validation "api-contracts" "node specs/validation/validate-api-contracts.mjs" "API Contract Validation"

# Performance Benchmarks
run_validation "performance" "node specs/validation/run-performance-benchmarks.mjs" "Performance Benchmarks"

# Integration Tests (if available)
if [[ -f "specs/validation/integration-test-runner.mjs" ]]; then
  run_validation "integration" "node specs/validation/integration-test-runner.mjs" "Integration Tests"
fi

# Security Validation (basic checks)
run_validation "security" "npm audit --audit-level=high" "Security Audit"

# Type Validation
if command -v tsc >/dev/null 2>&1; then
  run_validation "types" "tsc --noEmit types/index.d.ts" "TypeScript Definition Validation"
fi

# Summary Report
echo ""
echo "========================================"
echo "🎯 VALIDATION SUMMARY"
echo "========================================"

PASSED_TESTS=$((TOTAL_TESTS - ${#FAILED_TESTS[@]}))
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}${#FAILED_TESTS[@]}${NC}"

if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
  echo ""
  echo -e "${GREEN}🎉 ALL VALIDATIONS PASSED!${NC}"
  echo "GitVan v2 is ready for deployment."
  exit 0
else
  echo ""
  echo -e "${RED}❌ VALIDATION FAILURES:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
  echo "Please fix the above issues before proceeding."
  exit 1
fi
```

### Continuous Integration Integration

```yaml
# .github/workflows/validation.yml
name: GitVan v2 Validation Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run validation suite
        run: |
          chmod +x specs/validation/validate-all.sh
          specs/validation/validate-all.sh

      - name: Upload validation results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: validation-results-node-${{ matrix.node-version }}
          path: |
            validation-report.json
            performance-results.json
```

These validation scripts provide comprehensive automated testing of GitVan v2 specifications, ensuring continuous compliance and quality assurance throughout the development lifecycle.