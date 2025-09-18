import { IdempotencyTracker } from './tracker.mjs';
import { RollbackManager } from './rollback.mjs';
import { StateManager } from './state.mjs';

export {
  IdempotencyTracker,
  RollbackManager,
  StateManager
};

export function createIdempotencySystem(options = {}) {
  const tracker = new IdempotencyTracker(options);
  const rollback = new RollbackManager(options);
  const state = new StateManager(options);

  return {
    tracker,
    rollback,
    state,

    async trackOperation(operation) {
      return tracker.track(operation);
    },

    async createSnapshot(path) {
      return rollback.createSnapshot(path);
    },

    async rollbackTo(snapshotId) {
      return rollback.rollback(snapshotId);
    },

    async recordInstallation(packId, version, fingerprint, artifacts) {
      state.recordPackInstallation(packId, version, fingerprint, artifacts);
    },

    async isInstalled(packId, fingerprint = null) {
      return state.isPackInstalled(packId, fingerprint);
    },

    async createRollbackPlan(receipt) {
      return rollback.createRollbackPlan(receipt);
    },

    async executeRollback(plan) {
      return rollback.executePlan(plan);
    },

    async cleanup(days = 30) {
      await tracker.cleanup(days);
      await rollback.cleanupBackups(days);
    }
  };
}