/**
 * @fileoverview Event Correlator for Git Lifecycle Knowledge Hooks
 * Finds patterns and relationships across multiple git events
 * @module git-lifecycle/EventCorrelator
 */

/**
 * @typedef {Object} CorrelationPattern
 * @property {string} id - Pattern identifier
 * @property {string} name - Pattern name
 * @property {string[]} eventTypes - Event types in pattern
 * @property {number} maxTimeWindowMs - Maximum time window for correlation
 * @property {Function} matcher - Function to match events
 * @property {number} minConfidence - Minimum confidence score
 */

/**
 * @typedef {Object} CorrelationResult
 * @property {string} patternId - Matched pattern ID
 * @property {string} patternName - Pattern name
 * @property {Object[]} events - Correlated events
 * @property {number} confidence - Confidence score (0-1)
 * @property {number} startTime - Correlation start timestamp
 * @property {number} endTime - Correlation end timestamp
 * @property {Object} metadata - Additional metadata
 */

/**
 * Event Correlator for finding patterns across multiple events
 * @class
 */
export class EventCorrelator {
  /**
   * @param {Object} options - Correlator options
   * @param {import('./RdfEngine.mjs').RdfEngine} options.rdfEngine - RDF engine instance
   * @param {number} [options.defaultTimeWindow] - Default correlation time window
   */
  constructor({ rdfEngine, defaultTimeWindow = 300000 }) {
    /** @type {import('./RdfEngine.mjs').RdfEngine} */
    this.rdfEngine = rdfEngine;

    /** @type {number} */
    this.defaultTimeWindow = defaultTimeWindow;

    /** @type {Map<string, CorrelationPattern>} */
    this.patterns = new Map();

    // Register default patterns
    this._registerDefaultPatterns();
  }

  /**
   * Register default correlation patterns
   * @private
   */
  _registerDefaultPatterns() {
    // Commit → Push pattern
    this.registerPattern({
      id: 'commit-push',
      name: 'Commit to Push',
      eventTypes: ['commit', 'push'],
      maxTimeWindowMs: 300000, // 5 minutes
      minConfidence: 0.8,
      matcher: (events) => {
        const commits = events.filter(e => e.type === 'commit');
        const pushes = events.filter(e => e.type === 'push');

        if (commits.length === 0 || pushes.length === 0) {
          return null;
        }

        // Match commits to pushes by branch and timestamp
        const matches = [];
        for (const commit of commits) {
          for (const push of pushes) {
            if (commit.data.branch === push.data.branch &&
                push.timestamp > commit.timestamp &&
                push.timestamp - commit.timestamp < 300000) {
              matches.push({ commit, push });
            }
          }
        }

        return matches.length > 0 ? {
          matches,
          confidence: Math.min(matches.length / commits.length, 1.0)
        } : null;
      }
    });

    // Push → CI pattern
    this.registerPattern({
      id: 'push-ci',
      name: 'Push to CI',
      eventTypes: ['push', 'ci-start', 'ci-complete'],
      maxTimeWindowMs: 600000, // 10 minutes
      minConfidence: 0.7,
      matcher: (events) => {
        const pushes = events.filter(e => e.type === 'push');
        const ciStarts = events.filter(e => e.type === 'ci-start');
        const ciCompletes = events.filter(e => e.type === 'ci-complete');

        if (pushes.length === 0) {
          return null;
        }

        const workflows = [];
        for (const push of pushes) {
          const start = ciStarts.find(ci =>
            ci.data.commitSha === push.data.commitSha &&
            ci.timestamp > push.timestamp
          );

          if (start) {
            const complete = ciCompletes.find(ci =>
              ci.data.runId === start.data.runId
            );

            workflows.push({
              push,
              ciStart: start,
              ciComplete: complete ?? null
            });
          }
        }

        return workflows.length > 0 ? {
          workflows,
          confidence: workflows.length / pushes.length
        } : null;
      }
    });

    // Merge → Conflict pattern
    this.registerPattern({
      id: 'merge-conflict',
      name: 'Merge with Conflicts',
      eventTypes: ['merge', 'conflict', 'conflict-resolution'],
      maxTimeWindowMs: 3600000, // 1 hour
      minConfidence: 0.9,
      matcher: (events) => {
        const merges = events.filter(e => e.type === 'merge');
        const conflicts = events.filter(e => e.type === 'conflict');
        const resolutions = events.filter(e => e.type === 'conflict-resolution');

        const conflictedMerges = [];
        for (const merge of merges) {
          const mergeConflicts = conflicts.filter(c =>
            c.data.mergeSha === merge.data.sha &&
            c.timestamp >= merge.timestamp
          );

          if (mergeConflicts.length > 0) {
            const conflictResolutions = resolutions.filter(r =>
              mergeConflicts.some(c => c.data.file === r.data.file)
            );

            conflictedMerges.push({
              merge,
              conflicts: mergeConflicts,
              resolutions: conflictResolutions
            });
          }
        }

        return conflictedMerges.length > 0 ? {
          conflictedMerges,
          confidence: 1.0
        } : null;
      }
    });

    // Feature development pattern (branch → commits → PR → merge)
    this.registerPattern({
      id: 'feature-development',
      name: 'Feature Development Lifecycle',
      eventTypes: ['branch-create', 'commit', 'push', 'pr-create', 'pr-merge'],
      maxTimeWindowMs: 86400000, // 24 hours
      minConfidence: 0.6,
      matcher: (events) => {
        const branchCreates = events.filter(e => e.type === 'branch-create');
        const commits = events.filter(e => e.type === 'commit');
        const pushes = events.filter(e => e.type === 'push');
        const prCreates = events.filter(e => e.type === 'pr-create');
        const prMerges = events.filter(e => e.type === 'pr-merge');

        const features = [];
        for (const branch of branchCreates) {
          const branchName = branch.data.name;
          const branchCommits = commits.filter(c => c.data.branch === branchName);
          const branchPushes = pushes.filter(p => p.data.branch === branchName);
          const pr = prCreates.find(p => p.data.sourceBranch === branchName);
          const merge = pr ? prMerges.find(m => m.data.prNumber === pr.data.number) : null;

          if (branchCommits.length > 0) {
            features.push({
              branch,
              commits: branchCommits,
              pushes: branchPushes,
              pr: pr ?? null,
              merge: merge ?? null
            });
          }
        }

        return features.length > 0 ? {
          features,
          confidence: features.filter(f => f.merge).length / features.length
        } : null;
      }
    });

    // Hotfix pattern (branch → quick commits → fast merge)
    this.registerPattern({
      id: 'hotfix',
      name: 'Hotfix Workflow',
      eventTypes: ['branch-create', 'commit', 'push', 'merge'],
      maxTimeWindowMs: 3600000, // 1 hour
      minConfidence: 0.8,
      matcher: (events) => {
        const branchCreates = events.filter(e =>
          e.type === 'branch-create' &&
          (e.data.name?.includes('hotfix') || e.data.name?.includes('fix'))
        );
        const commits = events.filter(e => e.type === 'commit');
        const pushes = events.filter(e => e.type === 'push');
        const merges = events.filter(e => e.type === 'merge');

        const hotfixes = [];
        for (const branch of branchCreates) {
          const branchName = branch.data.name;
          const branchCommits = commits.filter(c => c.data.branch === branchName);
          const branchPushes = pushes.filter(p => p.data.branch === branchName);
          const merge = merges.find(m => m.data.sourceBranch === branchName);

          if (merge && (merge.timestamp - branch.timestamp) < 3600000) {
            hotfixes.push({
              branch,
              commits: branchCommits,
              pushes: branchPushes,
              merge,
              duration: merge.timestamp - branch.timestamp
            });
          }
        }

        return hotfixes.length > 0 ? {
          hotfixes,
          confidence: 1.0
        } : null;
      }
    });
  }

  /**
   * Register a correlation pattern
   * @param {CorrelationPattern} pattern - Pattern to register
   */
  registerPattern(pattern) {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Find correlations for given events using SPARQL
   * @param {Object[]} events - Events to correlate
   * @param {Object} options - Correlation options
   * @param {string[]} [options.patternIds] - Specific patterns to check
   * @param {number} [options.timeWindow] - Time window override
   * @returns {Promise<CorrelationResult[]>} Correlation results
   */
  async correlate(events, options = {}) {
    const patternsToCheck = options.patternIds
      ? options.patternIds.map(id => this.patterns.get(id)).filter(Boolean)
      : Array.from(this.patterns.values());

    const timeWindow = options.timeWindow ?? this.defaultTimeWindow;
    const results = [];

    for (const pattern of patternsToCheck) {
      // Filter events by type and time window
      const relevantEvents = events.filter(event =>
        pattern.eventTypes.includes(event.type) &&
        this._isWithinTimeWindow(event, events, pattern.maxTimeWindowMs)
      );

      if (relevantEvents.length === 0) {
        continue;
      }

      // Apply pattern matcher
      const matchResult = pattern.matcher(relevantEvents);

      if (matchResult && matchResult.confidence >= pattern.minConfidence) {
        results.push({
          patternId: pattern.id,
          patternName: pattern.name,
          events: relevantEvents,
          confidence: matchResult.confidence,
          startTime: Math.min(...relevantEvents.map(e => e.timestamp)),
          endTime: Math.max(...relevantEvents.map(e => e.timestamp)),
          metadata: matchResult
        });
      }
    }

    return results;
  }

  /**
   * Find correlations using complex SPARQL queries
   * @param {string} sparqlQuery - SPARQL query
   * @returns {Promise<CorrelationResult[]>} Query results
   */
  async queryCorrelations(sparqlQuery) {
    const results = await this.rdfEngine.query(sparqlQuery);

    // Transform SPARQL results to correlation results
    return this._transformSparqlResults(results);
  }

  /**
   * Find related events across time
   * @param {string} eventId - Starting event ID
   * @param {Object} options - Query options
   * @param {number} [options.maxDepth] - Maximum relationship depth
   * @param {string[]} [options.relationshipTypes] - Relationship types to follow
   * @returns {Promise<Object[]>} Related events
   */
  async findRelatedEvents(eventId, options = {}) {
    const maxDepth = options.maxDepth ?? 3;
    const relationshipTypes = options.relationshipTypes ?? [
      'triggers',
      'precedes',
      'causes',
      'related-to'
    ];

    const query = `
      PREFIX git: <http://gitvan.dev/ontology/git#>
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>

      SELECT ?relatedEvent ?relationship ?depth
      WHERE {
        VALUES ?startEvent { <${eventId}> }

        ?startEvent (lifecycle:triggers|lifecycle:precedes|lifecycle:causes|lifecycle:relatedTo){1,${maxDepth}} ?relatedEvent .
        ?startEvent ?relationship ?relatedEvent .

        BIND(
          IF(?relationship = lifecycle:triggers, 1,
          IF(?relationship = lifecycle:precedes, 2,
          IF(?relationship = lifecycle:causes, 3, 4))) AS ?depth
        )
      }
      ORDER BY ?depth
    `;

    return await this.queryCorrelations(query);
  }

  /**
   * Find patterns by author
   * @param {string} authorEmail - Author email
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>} Author patterns
   */
  async findAuthorPatterns(authorEmail, options = {}) {
    const timeWindow = options.timeWindow ?? this.defaultTimeWindow;

    const query = `
      PREFIX git: <http://gitvan.dev/ontology/git#>
      PREFIX lifecycle: <http://gitvan.dev/ontology/lifecycle#>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>

      SELECT ?event ?eventType ?timestamp ?branch
      WHERE {
        ?event a lifecycle:Event ;
               lifecycle:eventType ?eventType ;
               lifecycle:timestamp ?timestamp ;
               git:author ?author ;
               git:branch ?branch .

        ?author foaf:mbox "${authorEmail}" .

        FILTER(?timestamp > ${Date.now() - timeWindow})
      }
      ORDER BY ?timestamp
    `;

    const events = await this.rdfEngine.query(query);

    // Analyze patterns
    return this._analyzeAuthorPatterns(events);
  }

  /**
   * Check if event is within time window of other events
   * @private
   * @param {Object} event - Event to check
   * @param {Object[]} allEvents - All events
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} True if within window
   */
  _isWithinTimeWindow(event, allEvents, windowMs) {
    return allEvents.some(other =>
      other !== event &&
      Math.abs(other.timestamp - event.timestamp) <= windowMs
    );
  }

  /**
   * Transform SPARQL results to correlation results
   * @private
   * @param {Object[]} sparqlResults - SPARQL query results
   * @returns {CorrelationResult[]} Correlation results
   */
  _transformSparqlResults(sparqlResults) {
    // Group by correlation ID if present
    const grouped = new Map();

    for (const result of sparqlResults) {
      const correlationId = result.correlationId?.value ?? 'default';

      if (!grouped.has(correlationId)) {
        grouped.set(correlationId, []);
      }

      grouped.get(correlationId)?.push(result);
    }

    // Transform each group to correlation result
    return Array.from(grouped.entries()).map(([id, results]) => ({
      patternId: id,
      patternName: 'SPARQL Query Result',
      events: results,
      confidence: 1.0,
      startTime: Math.min(...results.map(r => parseInt(r.timestamp?.value ?? '0'))),
      endTime: Math.max(...results.map(r => parseInt(r.timestamp?.value ?? '0'))),
      metadata: { sparqlResults: results }
    }));
  }

  /**
   * Analyze author patterns
   * @private
   * @param {Object[]} events - Author events
   * @returns {Object} Pattern analysis
   */
  _analyzeAuthorPatterns(events) {
    const patterns = {
      commitFrequency: this._calculateCommitFrequency(events),
      preferredBranches: this._findPreferredBranches(events),
      workingHours: this._analyzeWorkingHours(events),
      eventSequences: this._findEventSequences(events)
    };

    return patterns;
  }

  /**
   * Calculate commit frequency
   * @private
   * @param {Object[]} events - Events
   * @returns {Object} Frequency data
   */
  _calculateCommitFrequency(events) {
    const commits = events.filter(e => e.eventType?.value === 'commit');
    const timeSpan = Math.max(...commits.map(c => parseInt(c.timestamp?.value ?? '0'))) -
                     Math.min(...commits.map(c => parseInt(c.timestamp?.value ?? '0')));

    return {
      total: commits.length,
      perDay: (commits.length / (timeSpan / 86400000)).toFixed(2),
      perHour: (commits.length / (timeSpan / 3600000)).toFixed(2)
    };
  }

  /**
   * Find preferred branches
   * @private
   * @param {Object[]} events - Events
   * @returns {Object[]} Branch statistics
   */
  _findPreferredBranches(events) {
    const branchCounts = new Map();

    for (const event of events) {
      const branch = event.branch?.value;
      if (branch) {
        branchCounts.set(branch, (branchCounts.get(branch) ?? 0) + 1);
      }
    }

    return Array.from(branchCounts.entries())
      .map(([branch, count]) => ({ branch, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze working hours
   * @private
   * @param {Object[]} events - Events
   * @returns {Object} Working hours data
   */
  _analyzeWorkingHours(events) {
    const hours = new Array(24).fill(0);

    for (const event of events) {
      const timestamp = parseInt(event.timestamp?.value ?? '0');
      const hour = new Date(timestamp).getHours();
      hours[hour]++;
    }

    return {
      distribution: hours,
      peakHour: hours.indexOf(Math.max(...hours)),
      activeHours: hours.filter(h => h > 0).length
    };
  }

  /**
   * Find common event sequences
   * @private
   * @param {Object[]} events - Events
   * @returns {Object[]} Common sequences
   */
  _findEventSequences(events) {
    const sequences = new Map();

    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i].eventType?.value;
      const next = events[i + 1].eventType?.value;
      const sequence = `${current} → ${next}`;

      sequences.set(sequence, (sequences.get(sequence) ?? 0) + 1);
    }

    return Array.from(sequences.entries())
      .map(([sequence, count]) => ({ sequence, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get all registered patterns
   * @returns {CorrelationPattern[]} Registered patterns
   */
  getPatterns() {
    return Array.from(this.patterns.values());
  }

  /**
   * Remove a pattern
   * @param {string} patternId - Pattern ID to remove
   * @returns {boolean} True if removed
   */
  removePattern(patternId) {
    return this.patterns.delete(patternId);
  }
}

/**
 * Create a new event correlator
 * @param {Object} options - Correlator options
 * @returns {EventCorrelator} Correlator instance
 */
export function createEventCorrelator(options) {
  return new EventCorrelator(options);
}
