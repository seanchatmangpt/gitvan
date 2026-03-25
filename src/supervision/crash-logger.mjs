// src/supervision/crash-logger.mjs
import { createHash } from 'node:crypto';
import { createLogger } from '../utils/logger.mjs';
import { useGit } from '../composables/git/index.mjs';

const logger = createLogger('supervision:crash');

const CRASH_NOTES_REF = 'refs/notes/gitvan/crashes';

export class CrashLogger {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.dryRun = options.dryRun || false;
    this.git = useGit();
  }

  async logCrash(crash) {
    const crashRecord = {
      id: this._generateCrashId(crash),
      processId: crash.processId,
      processType: crash.processType || 'unknown',
      error: {
        message: crash.error.message,
        stack: crash.error.stack,
        code: crash.error.code,
        name: crash.error.name
      },
      timestamp: crash.timestamp || new Date(),
      context: crash.context || {},
      system: this._getSystemInfo()
    };

    if (this.dryRun) {
      logger.debug(`[DRY RUN] Would log crash: ${crashRecord.id}`);
      this._addToMemoryLog(crashRecord);
      return crashRecord.id;
    }

    try {
      const noteContent = JSON.stringify(crashRecord, null, 2);
      await this.git.notes.add(noteContent, { ref: CRASH_NOTES_REF });
      logger.info(`Crash logged: ${crashRecord.id}`);
      return crashRecord.id;
    } catch (error) {
      logger.error(`Failed to log crash: ${error.message}`);
      throw error;
    }
  }

  _generateCrashId(crash) {
    const hash = createHash('sha256');
    hash.update(crash.processId);
    hash.update(Date.now().toString());
    hash.update(Math.random().toString());
    return `crash-${hash.digest('hex').substring(0, 12)}`;
  }

  _getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  _addToMemoryLog(crashRecord) {
    if (!this._memoryLog) {
      this._memoryLog = [];
    }
    this._memoryLog.push(crashRecord);
  }

  getCrashLogs() {
    return this._memoryLog || [];
  }

  async getCrashLogsSince(since) {
    if (this.dryRun) {
      return this.getCrashLogs().filter(log => log.timestamp >= since);
    }
    throw new Error('getCrashLogsSince not implemented in non-dry-run mode');
  }
}
