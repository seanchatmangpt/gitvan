// Knowledge Substrate Implementation
// Implements the formal model: G_t=(V_t,E_t,ℓ_V,ℓ_E) and K_t⊆R×R×R

import { useLog } from "../composables/log.mjs";

const logger = useLog("KnowledgeSubstrate");

/**
 * Time-indexed graph G_t=(V_t,E_t,ℓ_V,ℓ_E)
 * Triple store snapshot K_t⊆R×R×R
 * Delta operator ΔK_t := K_t∖K_{t^-}
 */
export class KnowledgeSubstrate {
  constructor(options = {}) {
    this.logger = options.logger || logger;
    this.tripleStore = new Map(); // K_t: Set of (s,p,o) triples
    this.timeIndex = new Map(); // Time-indexed snapshots
    this.deltas = new Map(); // ΔK_t for each time t
    this.currentTime = 0;
    this.nodeLabels = new Map(); // ℓ_V: vertex labels
    this.edgeLabels = new Map(); // ℓ_E: edge labels
  }

  /**
   * Add triple to knowledge base: K_{t^+} = K_t ∪ {(s,p,o)}
   */
  addTriple(subject, predicate, object, timestamp = null) {
    const t = timestamp || this.currentTime;
    const triple = { subject, predicate, object, timestamp: t };

    const tripleKey = `${subject}|${predicate}|${object}`;

    if (!this.tripleStore.has(tripleKey)) {
      this.tripleStore.set(tripleKey, triple);

      // Update time-indexed snapshot
      if (!this.timeIndex.has(t)) {
        this.timeIndex.set(t, new Set());
      }
      this.timeIndex.get(t).add(tripleKey);

      // Calculate delta
      this.calculateDelta(t);

      this.logger.info(
        `📊 Added triple: (${subject}, ${predicate}, ${object}) at t=${t}`
      );
    }

    return triple;
  }

  /**
   * Remove triple from knowledge base: K_{t^+} = K_t ∖ {(s,p,o)}
   */
  removeTriple(subject, predicate, object, timestamp = null) {
    const t = timestamp || this.currentTime;
    const tripleKey = `${subject}|${predicate}|${object}`;

    if (this.tripleStore.has(tripleKey)) {
      this.tripleStore.delete(tripleKey);

      // Update time-indexed snapshot
      if (this.timeIndex.has(t)) {
        this.timeIndex.get(t).delete(tripleKey);
      }

      // Calculate delta
      this.calculateDelta(t);

      this.logger.info(
        `📊 Removed triple: (${subject}, ${predicate}, ${object}) at t=${t}`
      );
    }
  }

  /**
   * Delta operator: ΔK_t := K_t ∖ K_{t^-}
   */
  calculateDelta(t) {
    const currentTriples = new Set();
    const previousTriples = new Set();

    // Get current state
    for (const [key, triple] of this.tripleStore) {
      if (triple.timestamp <= t) {
        currentTriples.add(key);
      }
    }

    // Get previous state
    for (const [key, triple] of this.tripleStore) {
      if (triple.timestamp < t) {
        previousTriples.add(key);
      }
    }

    // Calculate delta
    const delta = {
      added: new Set(
        [...currentTriples].filter((x) => !previousTriples.has(x))
      ),
      removed: new Set(
        [...previousTriples].filter((x) => !currentTriples.has(x))
      ),
      timestamp: t,
    };

    this.deltas.set(t, delta);
    return delta;
  }

  /**
   * Query knowledge base: Base relation T(s,p,o) from K_t
   */
  query(subject = null, predicate = null, object = null, timestamp = null) {
    const t = timestamp || this.currentTime;
    const results = [];

    for (const [key, triple] of this.tripleStore) {
      if (triple.timestamp <= t) {
        const matches =
          (subject === null || triple.subject === subject) &&
          (predicate === null || triple.predicate === predicate) &&
          (object === null || triple.object === object);

        if (matches) {
          results.push(triple);
        }
      }
    }

    return results;
  }

  /**
   * Join operation: T₁ ⋈ T₂
   */
  join(query1, query2, joinCondition) {
    const results = [];

    for (const t1 of query1) {
      for (const t2 of query2) {
        if (joinCondition(t1, t2)) {
          results.push({ ...t1, ...t2 });
        }
      }
    }

    return results;
  }

  /**
   * Projection: π_A(Q_t)
   */
  project(query, attributes) {
    return query.map((triple) => {
      const projected = {};
      for (const attr of attributes) {
        if (triple[attr] !== undefined) {
          projected[attr] = triple[attr];
        }
      }
      return projected;
    });
  }

  /**
   * Selection: σ_θ(Q_t)
   */
  select(query, condition) {
    return query.filter((triple) => condition(triple));
  }

  /**
   * Aggregation: γ_{g;f}(Q_t)
   */
  aggregate(query, groupBy, aggregateFunction) {
    const groups = new Map();

    for (const triple of query) {
      const key = groupBy(triple);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(triple);
    }

    const results = [];
    for (const [key, group] of groups) {
      results.push({
        group: key,
        aggregate: aggregateFunction(group),
      });
    }

    return results;
  }

  /**
   * Get current knowledge state K_t
   */
  getCurrentState(timestamp = null) {
    const t = timestamp || this.currentTime;
    const state = [];

    for (const [key, triple] of this.tripleStore) {
      if (triple.timestamp <= t) {
        state.push(triple);
      }
    }

    return state;
  }

  /**
   * Get delta at time t: ΔK_t
   */
  getDelta(timestamp) {
    return (
      this.deltas.get(timestamp) || {
        added: new Set(),
        removed: new Set(),
        timestamp,
      }
    );
  }

  /**
   * Advance time and update state
   */
  advanceTime(newTime) {
    const oldTime = this.currentTime;
    this.currentTime = newTime;

    this.logger.info(`⏰ Advanced time from ${oldTime} to ${newTime}`);

    // Calculate delta for the time advance
    this.calculateDelta(newTime);

    return this.getDelta(newTime);
  }

  /**
   * Get snapshot of knowledge base at current time
   */
  getSnapshot() {
    const snapshot = [];
    for (const [key, triple] of this.tripleStore) {
      snapshot.push(triple);
    }
    return snapshot;
  }

  /**
   * Get statistics about the knowledge base
   */
  getStats() {
    return {
      totalTriples: this.tripleStore.size,
      timePoints: this.timeIndex.size,
      deltas: this.deltas.size,
      currentTime: this.currentTime,
    };
  }
}
