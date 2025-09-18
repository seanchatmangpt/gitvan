/**
 * GitVan Graph Migration Utilities
 * Tools for migrating from legacy systems to graph-based architecture
 */

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { createGraphPackStateManager } from './pack/graph-state-manager.mjs'
import { createGraphUserFeedbackManager } from '../ai/graph-feedback-manager.mjs'
import { createGraphPackRegistry } from './pack/graph-registry.mjs'
import consola from 'consola'

/**
 * Graph Migration Manager
 * Orchestrates migration from legacy systems to graph-based architecture
 */
export class GraphMigrationManager {
  constructor(options = {}) {
    this.options = {
      migrationDir: options.migrationDir || '.gitvan/migrations',
      backupDir: options.backupDir || '.gitvan/backups',
      ...options
    }
    this.packStateManager = createGraphPackStateManager()
    this.feedbackManager = createGraphUserFeedbackManager()
    this.packRegistry = createGraphPackRegistry()
    this.migrationLog = []
  }

  /**
   * Initialize migration environment
   */
  async initialize() {
    await fs.mkdir(this.options.migrationDir, { recursive: true })
    await fs.mkdir(this.options.backupDir, { recursive: true })
    
    await this.packStateManager.initialize()
    await this.feedbackManager.initialize()
    await this.packRegistry.initialize()
    
    consola.info('Graph migration manager initialized')
  }

  /**
   * Migrate pack state from legacy JSON to graph
   */
  async migratePackState(legacyStatePath) {
    try {
      consola.info(`Migrating pack state from: ${legacyStatePath}`)
      
      // Create backup
      const backupPath = join(this.options.backupDir, `packs-backup-${Date.now()}.json`)
      await fs.copyFile(legacyStatePath, backupPath)
      consola.info(`Backup created: ${backupPath}`)
      
      // Migrate to graph
      const result = await this.packStateManager.migrateFromLegacy(legacyStatePath)
      
      // Log migration
      this.migrationLog.push({
        type: 'pack-state',
        source: legacyStatePath,
        backup: backupPath,
        result,
        timestamp: new Date().toISOString()
      })
      
      consola.success(`Pack state migration completed: ${result.migrated} packs migrated`)
      return result
    } catch (error) {
      consola.error('Pack state migration failed:', error.message)
      throw error
    }
  }

  /**
   * Migrate user feedback from legacy JSON to graph
   */
  async migrateUserFeedback(legacyFeedbackPath) {
    try {
      consola.info(`Migrating user feedback from: ${legacyFeedbackPath}`)
      
      // Create backup
      const backupPath = join(this.options.backupDir, `feedback-backup-${Date.now()}.json`)
      await fs.copyFile(legacyFeedbackPath, backupPath)
      consola.info(`Backup created: ${backupPath}`)
      
      // Migrate to graph
      const result = await this.feedbackManager.migrateFromLegacy(legacyFeedbackPath)
      
      // Log migration
      this.migrationLog.push({
        type: 'user-feedback',
        source: legacyFeedbackPath,
        backup: backupPath,
        result,
        timestamp: new Date().toISOString()
      })
      
      consola.success(`User feedback migration completed: ${result.migrated} feedback entries migrated`)
      return result
    } catch (error) {
      consola.error('User feedback migration failed:', error.message)
      throw error
    }
  }

  /**
   * Migrate pack registry from legacy system to graph
   */
  async migratePackRegistry(legacyRegistryData) {
    try {
      consola.info(`Migrating pack registry: ${legacyRegistryData.length} packs`)
      
      // Create backup
      const backupPath = join(this.options.backupDir, `registry-backup-${Date.now()}.json`)
      await fs.writeFile(backupPath, JSON.stringify(legacyRegistryData, null, 2))
      consola.info(`Backup created: ${backupPath}`)
      
      // Migrate to graph
      const result = await this.packRegistry.bulkRegisterPacks(legacyRegistryData)
      
      // Log migration
      this.migrationLog.push({
        type: 'pack-registry',
        source: 'legacy-registry-data',
        backup: backupPath,
        result: {
          total: legacyRegistryData.length,
          successful: result.filter(r => r.status === 'registered').length,
          failed: result.filter(r => r.status === 'failed').length
        },
        timestamp: new Date().toISOString()
      })
      
      consola.success(`Pack registry migration completed: ${result.filter(r => r.status === 'registered').length}/${legacyRegistryData.length} packs migrated`)
      return result
    } catch (error) {
      consola.error('Pack registry migration failed:', error.message)
      throw error
    }
  }

  /**
   * Perform complete migration of all legacy systems
   */
  async migrateAll(legacyPaths) {
    await this.initialize()
    
    const results = {
      packState: null,
      userFeedback: null,
      packRegistry: null
    }
    
    try {
      // Migrate pack state
      if (legacyPaths.packState) {
        results.packState = await this.migratePackState(legacyPaths.packState)
      }
      
      // Migrate user feedback
      if (legacyPaths.userFeedback) {
        results.userFeedback = await this.migrateUserFeedback(legacyPaths.userFeedback)
      }
      
      // Migrate pack registry
      if (legacyPaths.packRegistry) {
        results.packRegistry = await this.migratePackRegistry(legacyPaths.packRegistry)
      }
      
      // Save migration log
      await this.saveMigrationLog()
      
      consola.success('Complete migration completed successfully!')
      return results
    } catch (error) {
      consola.error('Complete migration failed:', error.message)
      throw error
    }
  }

  /**
   * Verify migration integrity
   */
  async verifyMigration() {
    consola.info('Verifying migration integrity...')
    
    const verification = {
      packState: await this.verifyPackState(),
      userFeedback: await this.verifyUserFeedback(),
      packRegistry: await this.verifyPackRegistry()
    }
    
    const allValid = Object.values(verification).every(v => v.valid)
    
    if (allValid) {
      consola.success('Migration verification passed!')
    } else {
      consola.warn('Migration verification found issues')
    }
    
    return verification
  }

  /**
   * Verify pack state migration
   */
  async verifyPackState() {
    try {
      const packs = await this.packStateManager.getAllPacks()
      const analytics = await this.packStateManager.generateAnalytics()
      
      return {
        valid: true,
        packsCount: packs.length,
        analytics,
        message: 'Pack state migration verified'
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        message: 'Pack state migration verification failed'
      }
    }
  }

  /**
   * Verify user feedback migration
   */
  async verifyUserFeedback() {
    try {
      const analytics = await this.feedbackManager.generateAnalytics()
      
      return {
        valid: true,
        totalFeedback: analytics.totalFeedback,
        analytics,
        message: 'User feedback migration verified'
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        message: 'User feedback migration verification failed'
      }
    }
  }

  /**
   * Verify pack registry migration
   */
  async verifyPackRegistry() {
    try {
      const analytics = await this.packRegistry.getRegistryAnalytics()
      
      return {
        valid: true,
        totalPacks: analytics.totalPacks,
        analytics,
        message: 'Pack registry migration verified'
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        message: 'Pack registry migration verification failed'
      }
    }
  }

  /**
   * Save migration log
   */
  async saveMigrationLog() {
    const logPath = join(this.options.migrationDir, `migration-log-${Date.now()}.json`)
    await fs.writeFile(logPath, JSON.stringify({
      migrations: this.migrationLog,
      summary: {
        totalMigrations: this.migrationLog.length,
        completedAt: new Date().toISOString()
      }
    }, null, 2))
    
    consola.info(`Migration log saved: ${logPath}`)
  }

  /**
   * Rollback migration (restore from backups)
   */
  async rollbackMigration(migrationLogPath) {
    try {
      const logData = JSON.parse(await fs.readFile(migrationLogPath, 'utf8'))
      
      consola.info(`Rolling back ${logData.migrations.length} migrations`)
      
      for (const migration of logData.migrations) {
        if (migration.backup) {
          // Restore from backup
          await fs.copyFile(migration.backup, migration.source)
          consola.info(`Restored: ${migration.source}`)
        }
      }
      
      consola.success('Migration rollback completed')
    } catch (error) {
      consola.error('Migration rollback failed:', error.message)
      throw error
    }
  }

  /**
   * Generate migration report
   */
  async generateMigrationReport() {
    const report = {
      migrationLog: this.migrationLog,
      verification: await this.verifyMigration(),
      analytics: {
        packState: await this.packStateManager.generateAnalytics(),
        userFeedback: await this.feedbackManager.generateAnalytics(),
        packRegistry: await this.packRegistry.getRegistryAnalytics()
      },
      generatedAt: new Date().toISOString()
    }
    
    const reportPath = join(this.options.migrationDir, `migration-report-${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    consola.info(`Migration report generated: ${reportPath}`)
    return report
  }
}

/**
 * Legacy System Detector
 * Automatically detects legacy systems that need migration
 */
export class LegacySystemDetector {
  constructor() {
    this.detectedSystems = []
  }

  /**
   * Scan for legacy systems
   */
  async scanForLegacySystems(rootDir = '.') {
    const legacyPaths = {
      packState: null,
      userFeedback: null,
      packRegistry: null
    }
    
    // Check for legacy pack state
    const packStatePaths = [
      join(rootDir, '.gitvan/packs.json'),
      join(rootDir, '.gitvan/state/packs.json'),
      join(rootDir, 'packs.json')
    ]
    
    for (const path of packStatePaths) {
      try {
        await fs.access(path)
        legacyPaths.packState = path
        this.detectedSystems.push({
          type: 'pack-state',
          path,
          size: (await fs.stat(path)).size
        })
        break
      } catch {
        // File doesn't exist
      }
    }
    
    // Check for legacy user feedback
    const feedbackPaths = [
      join(rootDir, '.gitvan/feedback/user-feedback.json'),
      join(rootDir, '.gitvan/feedback.json'),
      join(rootDir, 'user-feedback.json')
    ]
    
    for (const path of feedbackPaths) {
      try {
        await fs.access(path)
        legacyPaths.userFeedback = path
        this.detectedSystems.push({
          type: 'user-feedback',
          path,
          size: (await fs.stat(path)).size
        })
        break
      } catch {
        // File doesn't exist
      }
    }
    
    // Check for legacy pack registry (in-memory or file-based)
    // This would need to be detected from the actual registry implementation
    
    return legacyPaths
  }

  /**
   * Get detected systems summary
   */
  getDetectedSystems() {
    return {
      total: this.detectedSystems.length,
      systems: this.detectedSystems,
      totalSize: this.detectedSystems.reduce((sum, sys) => sum + sys.size, 0)
    }
  }
}

/**
 * Graph Migration CLI
 * Command-line interface for migration operations
 */
export class GraphMigrationCLI {
  constructor() {
    this.migrationManager = new GraphMigrationManager()
    this.detector = new LegacySystemDetector()
  }

  /**
   * Run migration command
   */
  async runMigration(command, options = {}) {
    switch (command) {
      case 'scan':
        return await this.scan()
      
      case 'migrate':
        return await this.migrate(options)
      
      case 'verify':
        return await this.verify()
      
      case 'rollback':
        return await this.rollback(options.logPath)
      
      case 'report':
        return await this.report()
      
      default:
        throw new Error(`Unknown migration command: ${command}`)
    }
  }

  /**
   * Scan for legacy systems
   */
  async scan() {
    consola.info('Scanning for legacy systems...')
    
    const legacyPaths = await this.detector.scanForLegacySystems()
    const summary = this.detector.getDetectedSystems()
    
    console.log('\n📊 Legacy Systems Detected:')
    console.log('=' .repeat(50))
    
    if (summary.total === 0) {
      console.log('✅ No legacy systems detected')
    } else {
      summary.systems.forEach(system => {
        console.log(`📁 ${system.type}: ${system.path} (${system.size} bytes)`)
      })
      console.log(`\n📈 Total: ${summary.total} systems, ${summary.totalSize} bytes`)
    }
    
    return { legacyPaths, summary }
  }

  /**
   * Migrate legacy systems
   */
  async migrate(options = {}) {
    consola.info('Starting migration...')
    
    const legacyPaths = options.legacyPaths || await this.detector.scanForLegacySystems()
    
    if (Object.values(legacyPaths).every(path => !path)) {
      console.log('ℹ️ No legacy systems found to migrate')
      return { message: 'No migration needed' }
    }
    
    const results = await this.migrationManager.migrateAll(legacyPaths)
    
    console.log('\n🎉 Migration Results:')
    console.log('=' .repeat(50))
    
    if (results.packState) {
      console.log(`📦 Pack State: ${results.packState.migrated} packs migrated`)
    }
    
    if (results.userFeedback) {
      console.log(`💬 User Feedback: ${results.userFeedback.migrated} entries migrated`)
    }
    
    if (results.packRegistry) {
      const successful = results.packRegistry.filter(r => r.status === 'registered').length
      console.log(`📚 Pack Registry: ${successful} packs migrated`)
    }
    
    return results
  }

  /**
   * Verify migration
   */
  async verify() {
    consola.info('Verifying migration...')
    
    const verification = await this.migrationManager.verifyMigration()
    
    console.log('\n🔍 Migration Verification:')
    console.log('=' .repeat(50))
    
    Object.entries(verification).forEach(([system, result]) => {
      const status = result.valid ? '✅' : '❌'
      console.log(`${status} ${system}: ${result.message}`)
      if (!result.valid) {
        console.log(`   Error: ${result.error}`)
      }
    })
    
    return verification
  }

  /**
   * Rollback migration
   */
  async rollback(logPath) {
    if (!logPath) {
      throw new Error('Migration log path required for rollback')
    }
    
    consola.info(`Rolling back migration from: ${logPath}`)
    
    await this.migrationManager.rollbackMigration(logPath)
    
    console.log('🔄 Migration rollback completed')
    return { status: 'rolled-back' }
  }

  /**
   * Generate migration report
   */
  async report() {
    consola.info('Generating migration report...')
    
    const report = await this.migrationManager.generateMigrationReport()
    
    console.log('\n📊 Migration Report:')
    console.log('=' .repeat(50))
    console.log(`📅 Generated: ${report.generatedAt}`)
    console.log(`📝 Migrations: ${report.migrationLog.length}`)
    
    if (report.analytics.packState) {
      console.log(`📦 Packs: ${report.analytics.packState.totalPacks}`)
    }
    
    if (report.analytics.userFeedback) {
      console.log(`💬 Feedback: ${report.analytics.userFeedback.totalFeedback}`)
    }
    
    if (report.analytics.packRegistry) {
      console.log(`📚 Registry: ${report.analytics.packRegistry.totalPacks}`)
    }
    
    return report
  }
}

/**
 * Factory functions
 */
export function createGraphMigrationManager(options = {}) {
  return new GraphMigrationManager(options)
}

export function createLegacySystemDetector() {
  return new LegacySystemDetector()
}

export function createGraphMigrationCLI() {
  return new GraphMigrationCLI()
}





