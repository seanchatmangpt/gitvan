import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, statSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'
import { SnapshotManager, SnapshotConfig } from './snapshot.js'

/**
 * Snapshot management utilities for CLI operations
 */
export class SnapshotManagerUtils {
  constructor(config = new SnapshotConfig()) {
    this.manager = new SnapshotManager(config)
  }

  /**
   * List all snapshots in a directory
   */
  listSnapshots(testDir) {
    const snapshotDir = join(testDir, this.manager.config.snapshotDir)
    if (!existsSync(snapshotDir)) {
      return []
    }

    const files = readdirSync(snapshotDir)
    return files
      .filter((file) => file.endsWith('.snap'))
      .map((file) => {
        const fullPath = join(snapshotDir, file)
        const stats = statSync(fullPath)
        return {
          name: file,
          path: fullPath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        }
      })
  }

  /**
   * Get snapshot statistics
   */
  getSnapshotStats(testDir) {
    const snapshots = this.listSnapshots(testDir)
    const totalSize = snapshots.reduce((sum, snap) => sum + snap.size, 0)

    return {
      count: snapshots.length,
      totalSize,
      averageSize: snapshots.length > 0 ? totalSize / snapshots.length : 0,
      oldest: snapshots.length > 0 ? Math.min(...snapshots.map((s) => s.created.getTime())) : null,
      newest: snapshots.length > 0 ? Math.max(...snapshots.map((s) => s.created.getTime())) : null,
    }
  }

  /**
   * Clean up old snapshots
   */
  cleanupOldSnapshots(testDir, maxAge = 30 * 24 * 60 * 60 * 1000) {
    // 30 days default
    const snapshots = this.listSnapshots(testDir)
    const cutoffTime = Date.now() - maxAge
    const toDelete = snapshots.filter((snap) => snap.created.getTime() < cutoffTime)

    toDelete.forEach((snap) => {
      try {
        unlinkSync(snap.path)
        console.log(`🗑️ Deleted old snapshot: ${snap.name}`)
      } catch (error) {
        console.warn(`⚠️ Failed to delete snapshot ${snap.name}: ${error.message}`)
      }
    })

    return toDelete.length
  }

  /**
   * Validate all snapshots in a directory
   */
  validateSnapshots(testDir) {
    const snapshots = this.listSnapshots(testDir)
    const results = []

    for (const snap of snapshots) {
      try {
        const content = readFileSync(snap.path, 'utf8')
        const snapshotData = JSON.parse(content)

        // Validate snapshot structure
        if (!snapshotData.data) {
          results.push({
            name: snap.name,
            valid: false,
            error: 'Missing data property',
          })
          continue
        }

        if (!snapshotData.metadata) {
          results.push({
            name: snap.name,
            valid: false,
            error: 'Missing metadata property',
          })
          continue
        }

        results.push({
          name: snap.name,
          valid: true,
          size: snap.size,
          created: snapshotData.metadata.created,
        })
      } catch (error) {
        results.push({
          name: snap.name,
          valid: false,
          error: error.message,
        })
      }
    }

    return results
  }

  /**
   * Export snapshots to a file
   */
  exportSnapshots(testDir, outputFile) {
    const snapshots = this.listSnapshots(testDir)
    const exportData = {
      exported: new Date().toISOString(),
      testDir,
      snapshots: [],
    }

    for (const snap of snapshots) {
      try {
        const content = readFileSync(snap.path, 'utf8')
        const snapshotData = JSON.parse(content)
        exportData.snapshots.push({
          name: snap.name,
          data: snapshotData,
        })
      } catch (error) {
        console.warn(`⚠️ Failed to export snapshot ${snap.name}: ${error.message}`)
      }
    }

    writeFileSync(outputFile, JSON.stringify(exportData, null, 2))
    return exportData.snapshots.length
  }

  /**
   * Import snapshots from a file
   */
  importSnapshots(importFile, testDir) {
    const content = readFileSync(importFile, 'utf8')
    const importData = JSON.parse(content)

    let imported = 0
    for (const snap of importData.snapshots) {
      try {
        const snapshotPath = join(testDir, this.manager.config.snapshotDir, snap.name)
        writeFileSync(snapshotPath, JSON.stringify(snap.data, null, 2))
        imported++
      } catch (error) {
        console.warn(`⚠️ Failed to import snapshot ${snap.name}: ${error.message}`)
      }
    }

    return imported
  }

  /**
   * Compare snapshots between two directories
   */
  compareSnapshots(testDir1, testDir2) {
    const snapshots1 = this.listSnapshots(testDir1)
    const snapshots2 = this.listSnapshots(testDir2)

    const comparison = {
      onlyInFirst: [],
      onlyInSecond: [],
      different: [],
      same: [],
    }

    const names1 = new Set(snapshots1.map((s) => s.name))
    const names2 = new Set(snapshots2.map((s) => s.name))

    // Find snapshots only in first directory
    for (const snap of snapshots1) {
      if (!names2.has(snap.name)) {
        comparison.onlyInFirst.push(snap.name)
      }
    }

    // Find snapshots only in second directory
    for (const snap of snapshots2) {
      if (!names1.has(snap.name)) {
        comparison.onlyInSecond.push(snap.name)
      }
    }

    // Compare common snapshots
    for (const snap of snapshots1) {
      if (names2.has(snap.name)) {
        const snap2 = snapshots2.find((s) => s.name === snap.name)
        if (snap.size !== snap2.size || snap.modified.getTime() !== snap2.modified.getTime()) {
          comparison.different.push(snap.name)
        } else {
          comparison.same.push(snap.name)
        }
      }
    }

    return comparison
  }

  /**
   * Generate snapshot report
   */
  generateReport(testDir) {
    const stats = this.getSnapshotStats(testDir)
    const validation = this.validateSnapshots(testDir)
    const snapshots = this.listSnapshots(testDir)

    const report = {
      generated: new Date().toISOString(),
      testDir,
      summary: {
        totalSnapshots: stats.count,
        totalSize: stats.totalSize,
        averageSize: stats.averageSize,
        validSnapshots: validation.filter((v) => v.valid).length,
        invalidSnapshots: validation.filter((v) => !v.valid).length,
      },
      snapshots: snapshots.map((snap) => {
        const validationResult = validation.find((v) => v.name === snap.name)
        return {
          name: snap.name,
          size: snap.size,
          created: snap.created,
          modified: snap.modified,
          valid: validationResult ? validationResult.valid : false,
          error: validationResult && !validationResult.valid ? validationResult.error : null,
        }
      }),
    }

    return report
  }
}

/**
 * Convenience functions for snapshot management
 */
export const snapshotManagement = {
  /**
   * Create a snapshot manager utility instance
   */
  createManager(config) {
    return new SnapshotManagerUtils(config)
  },

  /**
   * Quick snapshot cleanup
   */
  async cleanup(testDir, maxAge) {
    const manager = new SnapshotManagerUtils()
    return manager.cleanupOldSnapshots(testDir, maxAge)
  },

  /**
   * Quick snapshot validation
   */
  async validate(testDir) {
    const manager = new SnapshotManagerUtils()
    return manager.validateSnapshots(testDir)
  },

  /**
   * Quick snapshot export
   */
  async export(testDir, outputFile) {
    const manager = new SnapshotManagerUtils()
    return manager.exportSnapshots(testDir, outputFile)
  },

  /**
   * Quick snapshot import
   */
  async import(importFile, testDir) {
    const manager = new SnapshotManagerUtils()
    return manager.importSnapshots(importFile, testDir)
  },

  /**
   * Quick snapshot comparison
   */
  async compare(testDir1, testDir2) {
    const manager = new SnapshotManagerUtils()
    return manager.compareSnapshots(testDir1, testDir2)
  },

  /**
   * Quick snapshot report
   */
  async report(testDir) {
    const manager = new SnapshotManagerUtils()
    return manager.generateReport(testDir)
  },
}

export default {
  SnapshotManagerUtils,
  snapshotManagement,
}
