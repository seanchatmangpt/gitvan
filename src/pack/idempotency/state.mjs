import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'pathe';
import { createLogger } from '../../utils/logger.mjs';

export class StateManager {
  constructor(options = {}) {
    this.options = options;
    this.logger = createLogger('pack:state');
    this.stateDir = options.stateDir || '.gitvan/state';
    this.state = this.loadState();
  }

  loadState() {
    const statePath = join(this.stateDir, 'packs.json');

    if (existsSync(statePath)) {
      try {
        return JSON.parse(readFileSync(statePath, 'utf8'));
      } catch (e) {
        this.logger.warn('Invalid state file, creating new state');
        return this.createEmptyState();
      }
    }

    return this.createEmptyState();
  }

  createEmptyState() {
    return {
      version: '1.0',
      packs: {},
      operations: [],
      lastUpdated: new Date().toISOString()
    };
  }

  saveState() {
    const stateDir = dirname(join(this.stateDir, 'packs.json'));
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    this.state.lastUpdated = new Date().toISOString();

    const statePath = join(this.stateDir, 'packs.json');
    writeFileSync(statePath, JSON.stringify(this.state, null, 2));
  }

  recordPackInstallation(packId, version, fingerprint, artifacts) {
    this.state.packs[packId] = {
      version,
      fingerprint,
      installedAt: new Date().toISOString(),
      artifacts: artifacts || []
    };

    this.saveState();
  }

  recordOperation(operation) {
    this.state.operations.push({
      ...operation,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 operations
    if (this.state.operations.length > 100) {
      this.state.operations = this.state.operations.slice(-100);
    }

    this.saveState();
  }

  getPackState(packId) {
    return this.state.packs[packId];
  }

  isPackInstalled(packId, fingerprint = null) {
    const packState = this.state.packs[packId];

    if (!packState) {
      return false;
    }

    if (fingerprint && packState.fingerprint !== fingerprint) {
      return false;
    }

    return true;
  }

  removePackState(packId) {
    delete this.state.packs[packId];
    this.saveState();
  }

  reset() {
    this.state = this.createEmptyState();
    this.saveState();
  }

  export() {
    return JSON.parse(JSON.stringify(this.state));
  }

  import(state) {
    this.state = { ...this.createEmptyState(), ...state };
    this.saveState();
  }
}