/**
 * @fileoverview GitVan v4 — Change Stream Composable
 *
 * Provides reactive change feeds for RDF store mutations with event-driven
 * hook evaluation. Uses watchFile-based detection on .git directory for
 * maximum simplicity and portability (80/20 focus).
 *
 * Key Features:
 * - Watch git repository for changes via watchFile on .git
 * - Event emission: quad-added, quad-removed, store-mutated
 * - Backpressure handling with bounded queue
 * - Batched event processing (collect, flush on demand every 100ms)
 * - Stream lifecycle: open, pause, resume, close
 * - Context-aware via unctx
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { watchFile, unwatchFile } from "node:fs";
import path from "node:path";
import { useGitVan, tryUseGitVan } from "../core/context.mjs";
import EventEmitter from "node:events";

/**
 * Create a change stream that watches git repository for mutations
 *
 * @function useChangeStream
 * @returns {Object} Change stream object with lifecycle and event methods
 *
 * @example
 * const stream = useChangeStream();
 * await stream.open({ batchSize: 100, flushIntervalMs: 100 });
 * stream.on('store-mutated', (event) => {
 *   console.log('Store changed:', event);
 * });
 * // ... later
 * await stream.close();
 */
export function useChangeStream() {
  // Get context from unctx
  let ctx;
  try {
    ctx = useGitVan();
  } catch {
    ctx = tryUseGitVan?.() || null;
  }

  const cwd = (ctx && ctx.cwd) || process.cwd();
  const gitDir = path.join(cwd, ".git");

  // Stream state
  let isOpen = false;
  let isPaused = false;
  let watcher = null;
  let emitter = new EventEmitter();

  // Queue for batching
  let eventQueue = [];
  let stats = {
    quadsAdded: 0,
    quadsRemoved: 0,
    storeMutations: 0,
    eventsQueued: 0,
    eventsFlushed: 0,
    flushes: 0,
  };

  // Batch processing
  let flushInterval = null;
  let lastFlushTime = Date.now();
  let batchSize = 100;
  let flushIntervalMs = 100;

  /**
   * Open the change stream and start watching for mutations
   * @async
   * @param {Object} options - Configuration options
   * @param {number} [options.batchSize=100] - Max events before auto-flush
   * @param {number} [options.flushIntervalMs=100] - Flush interval in milliseconds
   * @returns {Promise<void>}
   */
  async function open(options = {}) {
    if (isOpen) {
      throw new Error("Change stream is already open");
    }

    batchSize = options.batchSize || 100;
    flushIntervalMs = options.flushIntervalMs || 100;

    return new Promise((resolve, reject) => {
      try {
        // Start watching .git directory for changes
        watcher = watchFile(gitDir, { persistent: true }, () => {
          if (!isPaused) {
            // Emit store-mutated event
            const event = {
              type: "store-mutated",
              timestamp: Date.now(),
              source: ".git",
            };

            eventQueue.push(event);
            stats.eventsQueued++;
            stats.storeMutations++;

            // Auto-flush if queue exceeds batchSize
            if (eventQueue.length >= batchSize) {
              flush();
            }
          }
        });

        isOpen = true;

        // Set up periodic flush
        flushInterval = setInterval(() => {
          if (eventQueue.length > 0) {
            flush();
          }
        }, flushIntervalMs);

        resolve();
      } catch (error) {
        isOpen = false;
        reject(new Error(`Failed to open change stream: ${error.message}`));
      }
    });
  }

  /**
   * Close the change stream and stop watching
   * @async
   * @returns {Promise<void>}
   */
  async function close() {
    if (!isOpen) {
      return;
    }

    return new Promise((resolve) => {
      try {
        // Flush any remaining events
        if (eventQueue.length > 0) {
          flush();
        }

        // Clean up watcher
        if (watcher) {
          unwatchFile(gitDir, watcher);
          watcher = null;
        }

        // Clean up interval
        if (flushInterval) {
          clearInterval(flushInterval);
          flushInterval = null;
        }

        isOpen = false;
        isPaused = false;

        // Emit stream-closed event
        emitter.emit("stream-closed", { stats });

        resolve();
      } catch (error) {
        // Still resolve even if cleanup has issues
        isOpen = false;
        resolve();
      }
    });
  }

  /**
   * Pause event emission (queue still accumulates)
   * @returns {void}
   */
  function pause() {
    isPaused = true;
  }

  /**
   * Resume event emission
   * @returns {void}
   */
  function resume() {
    isPaused = false;
    // Flush accumulated events
    if (eventQueue.length > 0) {
      flush();
    }
  }

  /**
   * Manually flush queued events
   * @returns {void}
   */
  function flush() {
    // Don't flush if paused - keep events in queue
    if (isPaused || eventQueue.length === 0) {
      return;
    }

    const batch = eventQueue.splice(0);
    stats.eventsFlushed += batch.length;
    stats.flushes++;
    lastFlushTime = Date.now();

    // Emit batched event
    emitter.emit("batch-flushed", {
      events: batch,
      count: batch.length,
      timestamp: Date.now(),
    });

    // Emit individual events (in same tick)
    for (const event of batch) {
      // All events trigger store-mutated
      emitter.emit("store-mutated", event);

      // Also emit type-specific events
      if (event.type === "quad-added") {
        emitter.emit("quad-added", event);
      } else if (event.type === "quad-removed") {
        emitter.emit("quad-removed", event);
      }
    }
  }

  /**
   * Subscribe to change events
   * @param {string} eventType - Event type: store-mutated, quad-added, quad-removed, batch-flushed, stream-closed
   * @param {Function} handler - Event handler
   * @returns {void}
   */
  function on(eventType, handler) {
    if (typeof handler !== "function") {
      throw new Error("Handler must be a function");
    }
    emitter.on(eventType, handler);
  }

  /**
   * Subscribe to event (single shot)
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   * @returns {void}
   */
  function once(eventType, handler) {
    if (typeof handler !== "function") {
      throw new Error("Handler must be a function");
    }
    emitter.once(eventType, handler);
  }

  /**
   * Unsubscribe from events
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   * @returns {void}
   */
  function off(eventType, handler) {
    emitter.off(eventType, handler);
  }

  /**
   * Add event to stream (for testing or manual insertion)
   * @param {string} type - Event type: quad-added, quad-removed
   * @param {Object} data - Event data
   * @returns {void}
   */
  function addEvent(type, data) {
    if (!isOpen) {
      throw new Error("Change stream is not open");
    }

    const event = {
      type,
      timestamp: Date.now(),
      ...data,
    };

    eventQueue.push(event);
    stats.eventsQueued++;

    if (type === "quad-added") {
      stats.quadsAdded++;
    } else if (type === "quad-removed") {
      stats.quadsRemoved++;
    }

    if (eventQueue.length >= batchSize) {
      flush();
    }
  }

  /**
   * Get stream statistics
   * @returns {Object} Statistics object
   */
  function getStats() {
    return {
      ...stats,
      isOpen,
      isPaused,
      queueSize: eventQueue.length,
      uptime: isOpen ? Date.now() - lastFlushTime : 0,
    };
  }

  /**
   * Get stream status
   * @returns {Object} Status object
   */
  function getStatus() {
    return {
      isOpen,
      isPaused,
      queueSize: eventQueue.length,
      batchSize,
      flushIntervalMs,
      lastFlushTime,
    };
  }

  return {
    // Lifecycle
    async open(options) {
      return open(options);
    },
    async close() {
      return close();
    },

    // Event control
    pause,
    resume,
    flush,

    // Event subscription
    on,
    once,
    off,

    // Manual event insertion (for testing)
    addEvent,

    // Diagnostics
    getStats,
    getStatus,

    // For testing: direct access to queue (not recommended in production)
    _getQueue: () => [...eventQueue],
  };
}
