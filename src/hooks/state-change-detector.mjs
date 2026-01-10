/**
 * @fileoverview GitVan v4.0.0 — State Change Detection Engine
 *
 * Detects and tracks graph state changes at property level with delta computation.
 * Provides efficient change serialization and notifications.
 *
 * Features:
 * - Graph change detection engine
 * - Property-level tracking
 * - Delta computation (efficient)
 * - Change serialization
 * - Snapshot-based diffing
 *
 * @version 4.0.0
 * @license Apache-2.0
 */

/**
 * Represents a detected change in graph state
 * @class StateChange
 * @private
 */
class StateChange {
  /**
   * Create state change record
   * @param {string} subject - Changed subject
   * @param {string} predicate - Changed predicate
   * @param {*} oldValue - Previous value
   * @param {*} newValue - New value
   * @param {string} [type] - Change type ("add", "remove", "update")
   */
  constructor(subject, predicate, oldValue, newValue, type = "update") {
    this.subject = subject;
    this.predicate = predicate;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.type = type;
    this.timestamp = Date.now();
  }

  /**
   * Serialize change to JSON
   * @returns {Object} Serialized change
   */
  serialize() {
    return {
      subject: this.subject,
      predicate: this.predicate,
      oldValue: this._serializeValue(this.oldValue),
      newValue: this._serializeValue(this.newValue),
      type: this.type,
      timestamp: this.timestamp,
    };
  }

  /**
   * Serialize value for JSON compatibility
   * @private
   */
  _serializeValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return value;
  }
}

/**
 * State change detection engine
 *
 * Tracks graph state changes at the property level and provides
 * efficient delta computation with snapshot-based diffing.
 *
 * @class StateChangeDetector
 */
export class StateChangeDetector {
  /**
   * Create StateChangeDetector instance
   *
   * @constructor
   * @param {Object} [options={}] - Configuration options
   * @param {Object} [options.logger=console] - Logger instance
   * @param {boolean} [options.trackHistory=true] - Track change history
   * @param {number} [options.historyLimit=1000] - Max history entries
   * @param {boolean} [options.enableCompression=true] - Compress old snapshots
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.trackHistory = options.trackHistory !== false;
    this.historyLimit = options.historyLimit || 1000;
    this.enableCompression = options.enableCompression !== false;

    // State snapshots
    this.snapshots = new Map();
    this.snapshotHistory = [];
    this.changes = [];

    // Metrics
    this.metrics = {
      totalDetections: 0,
      totalChanges: 0,
      totalSubjects: 0,
      largestDelta: 0,
      averageDeltaSize: 0,
      deltaHistory: [],
    };
  }

  /**
   * Create snapshot of current graph state
   *
   * @param {Object} graph - Graph to snapshot
   * @param {string} [snapshotId] - Optional snapshot ID
   * @returns {string} Snapshot ID
   */
  createSnapshot(graph, snapshotId) {
    const id = snapshotId || this._generateSnapshotId();

    // Extract all quads from graph
    const quads = graph.store.getQuads();
    const snapshot = {
      id,
      timestamp: Date.now(),
      state: new Map(),
      quadCount: quads.length,
    };

    // Organize by subject-predicate
    for (const quad of quads) {
      const key = `${quad.subject.value}|${quad.predicate.value}`;
      const values = snapshot.state.get(key) || [];
      values.push(quad.object.value);
      snapshot.state.set(key, values);
    }

    this.snapshots.set(id, snapshot);
    if (this.trackHistory) {
      this.snapshotHistory.push(id);
      if (this.snapshotHistory.length > this.historyLimit) {
        const oldId = this.snapshotHistory.shift();
        this.snapshots.delete(oldId);
      }
    }

    this.logger.debug(`📸 Snapshot created: ${id}`);
    return id;
  }

  /**
   * Detect changes between two snapshots
   *
   * Computes delta and identifies all changes including
   * additions, removals, and updates.
   *
   * @param {string} previousSnapshotId - Previous snapshot ID
   * @param {string} currentSnapshotId - Current snapshot ID
   * @returns {Object} Detection result with changes
   * @throws {Error} If snapshots not found
   */
  detectChanges(previousSnapshotId, currentSnapshotId) {
    if (!this.snapshots.has(previousSnapshotId)) {
      throw new Error(`Snapshot ${previousSnapshotId} not found`);
    }
    if (!this.snapshots.has(currentSnapshotId)) {
      throw new Error(`Snapshot ${currentSnapshotId} not found`);
    }

    const startTime = performance.now();
    const previousSnapshot = this.snapshots.get(previousSnapshotId);
    const currentSnapshot = this.snapshots.get(currentSnapshotId);

    const detectedChanges = [];
    const affectedSubjects = new Set();

    // Detect changed and removed properties
    for (const [key, oldValues] of previousSnapshot.state.entries()) {
      const [subject, predicate] = key.split("|");
      affectedSubjects.add(subject);

      if (currentSnapshot.state.has(key)) {
        const newValues = currentSnapshot.state.get(key);

        // Check for value changes
        if (JSON.stringify(oldValues) !== JSON.stringify(newValues)) {
          for (const oldValue of oldValues) {
            if (!newValues.includes(oldValue)) {
              detectedChanges.push(
                new StateChange(subject, predicate, oldValue, null, "remove")
              );
            }
          }

          for (const newValue of newValues) {
            if (!oldValues.includes(newValue)) {
              detectedChanges.push(
                new StateChange(subject, predicate, null, newValue, "add")
              );
            }
          }
        }
      } else {
        // Property removed entirely
        for (const oldValue of oldValues) {
          detectedChanges.push(
            new StateChange(subject, predicate, oldValue, null, "remove")
          );
        }
      }
    }

    // Detect added properties
    for (const [key, newValues] of currentSnapshot.state.entries()) {
      if (!previousSnapshot.state.has(key)) {
        const [subject, predicate] = key.split("|");
        affectedSubjects.add(subject);

        for (const newValue of newValues) {
          detectedChanges.push(
            new StateChange(subject, predicate, null, newValue, "add")
          );
        }
      }
    }

    // Record metrics
    const duration = performance.now() - startTime;
    this.metrics.totalDetections++;
    this.metrics.totalChanges += detectedChanges.length;
    this.metrics.totalSubjects += affectedSubjects.size;

    // Track delta size
    const deltaSize = detectedChanges.length;
    if (deltaSize > this.metrics.largestDelta) {
      this.metrics.largestDelta = deltaSize;
    }
    this.metrics.deltaHistory.push(deltaSize);
    if (this.metrics.deltaHistory.length > 100) {
      this.metrics.deltaHistory.shift();
    }

    const sum = this.metrics.deltaHistory.reduce((a, b) => a + b, 0);
    this.metrics.averageDeltaSize = sum / this.metrics.deltaHistory.length;

    if (detectedChanges.length > 0) {
      this.logger.info(
        `🔍 Detected ${detectedChanges.length} changes in ${duration.toFixed(1)}ms`
      );
    }

    // Store changes if tracking history
    if (this.trackHistory) {
      for (const change of detectedChanges) {
        this.changes.push(change.serialize());
        if (this.changes.length > this.historyLimit) {
          this.changes.shift();
        }
      }
    }

    return {
      previousSnapshotId,
      currentSnapshotId,
      changes: detectedChanges,
      affectedSubjects: Array.from(affectedSubjects),
      changeCount: detectedChanges.length,
      detectionTime: duration,
      deltaSize,
    };
  }

  /**
   * Detect changes between graph and latest snapshot
   *
   * @param {Object} graph - Current graph state
   * @param {string} [previousSnapshotId] - Previous snapshot ID
   * @returns {Object} Detection result
   */
  detectChangesFromGraph(graph, previousSnapshotId) {
    // Create current snapshot
    const currentSnapshotId = this.createSnapshot(graph);

    // If no previous snapshot specified, use oldest in history
    const comparisonId =
      previousSnapshotId || this.snapshotHistory[0] || currentSnapshotId;

    if (comparisonId === currentSnapshotId && this.snapshotHistory.length < 2) {
      return {
        previousSnapshotId: null,
        currentSnapshotId,
        changes: [],
        affectedSubjects: [],
        changeCount: 0,
        detectionTime: 0,
        deltaSize: 0,
      };
    }

    return this.detectChanges(comparisonId, currentSnapshotId);
  }

  /**
   * Compute property-level changes for a specific subject
   *
   * @param {string} subject - Subject IRI
   * @param {string} previousSnapshotId - Previous snapshot ID
   * @param {string} currentSnapshotId - Current snapshot ID
   * @returns {Array<Object>} Property changes for subject
   */
  getSubjectChanges(subject, previousSnapshotId, currentSnapshotId) {
    if (!this.snapshots.has(previousSnapshotId)) {
      throw new Error(`Snapshot ${previousSnapshotId} not found`);
    }
    if (!this.snapshots.has(currentSnapshotId)) {
      throw new Error(`Snapshot ${currentSnapshotId} not found`);
    }

    const previousSnapshot = this.snapshots.get(previousSnapshotId);
    const currentSnapshot = this.snapshots.get(currentSnapshotId);

    const changes = [];

    // Check all properties of subject in both snapshots
    const previousKeys = Array.from(previousSnapshot.state.keys()).filter((k) =>
      k.startsWith(subject + "|")
    );
    const currentKeys = Array.from(currentSnapshot.state.keys()).filter((k) =>
      k.startsWith(subject + "|")
    );

    const allKeys = new Set([...previousKeys, ...currentKeys]);

    for (const key of allKeys) {
      const [, predicate] = key.split("|");
      const oldValues = previousSnapshot.state.get(key) || [];
      const newValues = currentSnapshot.state.get(key) || [];

      if (JSON.stringify(oldValues) !== JSON.stringify(newValues)) {
        changes.push({
          subject,
          predicate,
          oldValues,
          newValues,
          type: oldValues.length === 0 ? "add" : newValues.length === 0 ? "remove" : "update",
        });
      }
    }

    return changes;
  }

  /**
   * Get change history
   *
   * @param {Object} [options={}] - Filter options
   * @param {string} [options.subject] - Filter by subject
   * @param {string} [options.predicate] - Filter by predicate
   * @param {number} [options.limit=100] - Limit results
   * @returns {Array<Object>} Change history
   */
  getChangeHistory(options = {}) {
    let history = this.changes;

    if (options.subject) {
      history = history.filter((c) => c.subject === options.subject);
    }
    if (options.predicate) {
      history = history.filter((c) => c.predicate === options.predicate);
    }

    const limit = options.limit || 100;
    return history.slice(-limit);
  }

  /**
   * Get all snapshots
   *
   * @returns {Array<Object>} Snapshot list
   */
  getSnapshots() {
    const snapshots = [];
    for (const [id, snapshot] of this.snapshots.entries()) {
      snapshots.push({
        id,
        timestamp: snapshot.timestamp,
        quadCount: snapshot.quadCount,
        propertyCount: snapshot.state.size,
      });
    }
    return snapshots.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get snapshot by ID
   *
   * @param {string} snapshotId - Snapshot ID
   * @returns {Object|null} Snapshot details or null
   */
  getSnapshot(snapshotId) {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return null;

    return {
      id: snapshotId,
      timestamp: snapshot.timestamp,
      quadCount: snapshot.quadCount,
      propertyCount: snapshot.state.size,
    };
  }

  /**
   * Serialize change for transport
   *
   * @param {StateChange} change - Change to serialize
   * @returns {Object} Serialized change
   */
  serializeChange(change) {
    return change.serialize();
  }

  /**
   * Serialize multiple changes
   *
   * @param {Array<StateChange>} changes - Changes to serialize
   * @returns {Array<Object>} Serialized changes
   */
  serializeChanges(changes) {
    return changes.map((change) => change.serialize());
  }

  /**
   * Get metrics
   *
   * @returns {Object} Detection metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      snapshotCount: this.snapshots.size,
      changeHistorySize: this.changes.length,
    };
  }

  /**
   * Reset detector
   *
   * @returns {void}
   */
  reset() {
    this.snapshots.clear();
    this.snapshotHistory = [];
    this.changes = [];
    this.metrics = {
      totalDetections: 0,
      totalChanges: 0,
      totalSubjects: 0,
      largestDelta: 0,
      averageDeltaSize: 0,
      deltaHistory: [],
    };
    this.logger.info("🧹 StateChangeDetector reset");
  }

  /**
   * Generate snapshot ID
   *
   * @private
   */
  _generateSnapshotId() {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create state change detector instance
 *
 * @param {Object} [options={}] - Configuration options
 * @returns {StateChangeDetector} Detector instance
 */
export function createStateChangeDetector(options = {}) {
  return new StateChangeDetector(options);
}

export default StateChangeDetector;
