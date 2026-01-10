/**
 * @fileoverview GitVan N3 Rules Engine Composable
 *
 * Forward-chaining N3 rule execution engine using unrdf.
 * - Parses N3 rules from Turtle format
 * - Executes forward-chaining inference
 * - Returns inferred triples
 * - Supports rule composition/chaining
 *
 * @version 4.0.0
 * @license Apache-2.0
 */

const LOG_PREFIX = "[N3Rules]";

/**
 * N3 Rule Engine - Forward-chaining inference
 *
 * @param {object} [options={}] - Configuration options
 * @param {object} [options.unrdfUtils] - Unrdf utilities (getQuads, addQuad, namedNode, literal, quad)
 * @returns {object} N3 Rules API
 */
export function useN3Rules(options = {}) {
  const rules = [];
  const inferredTriples = new Map(); // Cache of inferred triples per rule

  // Lazy-load unrdf utilities when needed
  let getQuads, addQuad, namedNode, literal, quad;

  async function ensureUnrdfLoaded() {
    if (!getQuads && options.unrdfUtils) {
      ({ getQuads, addQuad, namedNode, literal, quad } = options.unrdfUtils);
    }
    if (!getQuads) {
      // Try dynamic import as fallback
      try {
        const unrdf = await import("unrdf");
        getQuads = unrdf.getQuads;
        addQuad = unrdf.addQuad;
        namedNode = unrdf.namedNode;
        literal = unrdf.literal;
        quad = unrdf.quad;
      } catch (e) {
        console.warn(`${LOG_PREFIX} Could not load unrdf utilities: ${e.message}`);
      }
    }
  }

  /**
   * Parse N3 rules from Turtle content
   * Rules are represented as graph patterns:
   * @prefix gv: <https://gitvan.dev/rules#> .
   * example:Rule1 a gv:Rule ;
   *   gv:antecedent "?file ex:hasChurn ?churn . FILTER(?churn > 10)" ;
   *   gv:consequent "?file ex:isHighChurn true" ;
   *   gv:priority 100 .
   *
   * @param {string} turtleContent - Turtle content with rule definitions
   * @param {object} [options={}] - Parse options
   * @returns {Promise<Array<object>>} Parsed rules
   */
  async function loadRules(turtleContent, options = {}) {
    try {
      // In a real implementation, we'd parse the Turtle
      // For now, we extract rule definitions from comments and structure
      const rulePattern = /^\s*#\s*RULE:\s*(\{[\s\S]*?\})/gm;
      const matches = [...turtleContent.matchAll(rulePattern)];

      for (const match of matches) {
        try {
          const ruleObj = JSON.parse(match[1]);
          rules.push({
            id: ruleObj.id || `rule_${rules.length}`,
            name: ruleObj.name || `Rule ${rules.length}`,
            description: ruleObj.description || "",
            antecedent: ruleObj.antecedent || "",
            consequent: ruleObj.consequent || "",
            priority: ruleObj.priority || 100,
            tags: ruleObj.tags || [],
          });
        } catch (e) {
          console.warn(`${LOG_PREFIX} Failed to parse rule: ${e.message}`);
        }
      }

      return rules;
    } catch (error) {
      throw new Error(`Failed to load rules: ${error.message}`);
    }
  }

  /**
   * Execute rules against an RDF store (forward-chaining)
   *
   * @param {object} store - unrdf Store instance
   * @param {object} [options={}] - Execution options
   * @param {number} [options.maxIterations=10] - Max forward-chaining iterations
   * @param {Array<string>} [options.ruleIds] - Specific rules to execute (all if not specified)
   * @returns {Promise<Array<object>>} Inferred triples
   */
  async function executeRules(store, options = {}) {
    await ensureUnrdfLoaded();

    const maxIterations = options.maxIterations || 10;
    const ruleIds = options.ruleIds || rules.map((r) => r.id);
    const inferred = [];
    let iterationCount = 0;
    let storeChanged = true;

    // Forward-chaining loop
    while (storeChanged && iterationCount < maxIterations) {
      iterationCount++;
      storeChanged = false;

      for (const ruleId of ruleIds) {
        const rule = rules.find((r) => r.id === ruleId);
        if (!rule) continue;

        try {
          // Execute rule against current store state
          const newTriples = await _executeRule(rule, store);

          for (const triple of newTriples) {
            if (!triple) continue;
            // Check if triple already exists
            const existing = store.getQuads ?
              store.getQuads(triple.subject, triple.predicate, triple.object) :
              getQuads(store, triple.subject, triple.predicate, triple.object);

            if (existing.length === 0) {
              if (store.addQuad) {
                store.addQuad(triple);
              } else if (addQuad) {
                addQuad(store, triple);
              }
              inferred.push(triple);
              storeChanged = true;
            }
          }

          // Cache inferred triples for this rule
          inferredTriples.set(ruleId, newTriples);
        } catch (error) {
          console.error(`${LOG_PREFIX} Error executing rule ${ruleId}: ${error.message}`);
        }
      }
    }

    return inferred;
  }

  /**
   * Execute rules sequentially with output chaining
   * (output of rule N feeds input of rule N+1)
   *
   * @param {Array<object>} rulesToChain - Array of rules to execute
   * @param {object} store - unrdf Store instance
   * @param {object} [options={}] - Chaining options
   * @returns {Promise<object>} Chaining result
   */
  async function chainRules(rulesToChain, store, options = {}) {
    await ensureUnrdfLoaded();

    const results = {
      stages: [],
      totalInferred: [],
      chainedRules: [],
    };

    for (let i = 0; i < rulesToChain.length; i++) {
      const rule = rulesToChain[i];
      const stageResult = await executeRules(store, {
        ruleIds: [rule.id],
        maxIterations: options.maxIterations || 5,
      });

      const storeSize = store.getQuads ?
        store.getQuads().length :
        (getQuads ? getQuads(store).length : 0);

      results.stages.push({
        ruleId: rule.id,
        iteration: i + 1,
        inferred: stageResult,
        storeSize: storeSize,
      });

      results.totalInferred.push(...stageResult);
      results.chainedRules.push(rule.id);
    }

    return results;
  }

  /**
   * Add a new rule to the engine
   *
   * @param {object} rule - Rule definition
   * @param {string} rule.id - Unique rule identifier
   * @param {string} rule.name - Rule name
   * @param {string} rule.antecedent - SPARQL pattern for body
   * @param {string} rule.consequent - Triple pattern for head
   * @param {number} [rule.priority=100] - Execution priority
   * @returns {void}
   */
  function addRule(rule) {
    if (!rule.id || !rule.antecedent || !rule.consequent) {
      throw new Error("Rule must have id, antecedent, and consequent");
    }
    rules.push(rule);
  }

  /**
   * Get all loaded rules
   *
   * @returns {Array<object>} Array of rule definitions
   */
  function getRules() {
    return [...rules];
  }

  /**
   * Get inferred triples for a specific rule
   *
   * @param {string} ruleId - Rule identifier
   * @returns {Array<object>} Inferred triples
   */
  function getInferredTriples(ruleId) {
    return inferredTriples.get(ruleId) || [];
  }

  /**
   * Clear inferred triples cache
   *
   * @returns {void}
   */
  function clearInferredCache() {
    inferredTriples.clear();
  }

  /**
   * Internal: Execute a single rule against the store
   *
   * @private
   * @param {object} rule - Rule definition
   * @param {object} store - unrdf Store instance
   * @returns {Promise<Array<object>>} Derived triples
   */
  async function _executeRule(rule, store) {
    const derived = [];

    try {
      // For simple rules, we can use SPARQL CONSTRUCT
      // Pattern: antecedent matches patterns, consequent is constructed
      // Here we parse simple triple patterns

      const antecedentMatch = _parseTriplePattern(rule.antecedent);
      const consequent = _parseTriplePattern(rule.consequent);

      if (!antecedentMatch || !consequent) {
        return derived;
      }

      // Find matching quads in store
      const matches = store.getQuads ?
        store.getQuads(antecedentMatch.subject, antecedentMatch.predicate, antecedentMatch.object) :
        getQuads(store, antecedentMatch.subject, antecedentMatch.predicate, antecedentMatch.object);

      // For each match, instantiate the consequent
      for (const match of matches) {
        // Simple variable binding: replace ?var with matched values
        const binding = _extractBinding(match, antecedentMatch);
        const inferredTriple = _instantiatePattern(consequent, binding);

        if (inferredTriple) {
          derived.push(inferredTriple);
        }
      }

      return derived;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to execute rule: ${error.message}`);
      return derived;
    }
  }

  /**
   * Internal: Parse a simple triple pattern
   * Examples: "?file ex:hasChurn ?churn", "?file ex:isHighChurn true"
   *
   * @private
   * @param {string} pattern - Triple pattern string
   * @returns {object} Parsed pattern or null
   */
  function _parseTriplePattern(pattern) {
    if (!pattern) return null;

    // Very simple parser for basic triple patterns
    // Full N3 would need proper parsing
    const parts = pattern
      .trim()
      .split(/\s+/)
      .filter((p) => p && !p.startsWith("FILTER"));

    if (parts.length < 3) {
      return null;
    }

    return {
      subject: parts[0],
      predicate: parts[1],
      object: parts[2],
      original: pattern,
    };
  }

  /**
   * Internal: Extract variable bindings from matched quad
   *
   * @private
   * @param {object} quad - Matched quad
   * @param {object} pattern - Original pattern
   * @returns {object} Variable bindings
   */
  function _extractBinding(quad, pattern) {
    const binding = {};

    if (pattern.subject.startsWith("?")) {
      binding[pattern.subject] = quad.subject;
    }
    if (pattern.predicate.startsWith("?")) {
      binding[pattern.predicate] = quad.predicate;
    }
    if (pattern.object.startsWith("?")) {
      binding[pattern.object] = quad.object;
    }

    return binding;
  }

  /**
   * Internal: Instantiate a pattern with variable bindings
   *
   * @private
   * @param {object} pattern - Triple pattern
   * @param {object} binding - Variable bindings
   * @returns {object} Instantiated quad
   */
  function _instantiatePattern(pattern, binding) {
    try {
      // Helper to create named node
      const createNamedNode = (value) => {
        if (namedNode) return namedNode(value);
        // Fallback: return object with value property
        return { value, termType: 'NamedNode' };
      };

      // Helper to create literal
      const createLiteral = (value) => {
        if (literal) return literal(value);
        // Fallback: return object with value property
        return { value: String(value), termType: 'Literal' };
      };

      // Helper to create quad
      const createQuad = (s, p, o) => {
        if (quad) return quad(s, p, o);
        // Fallback: return plain object
        return { subject: s, predicate: p, object: o };
      };

      const subject = binding[pattern.subject] || createNamedNode(pattern.subject);
      let object = binding[pattern.object];

      if (!object) {
        // Try to create a literal if it's a plain value
        if (pattern.object === "true" || pattern.object === "false") {
          object = createLiteral(pattern.object === "true");
        } else if (/^\d+$/.test(pattern.object)) {
          object = createLiteral(parseInt(pattern.object));
        } else if (pattern.object.startsWith('"') && pattern.object.endsWith('"')) {
          object = createLiteral(pattern.object.slice(1, -1));
        } else {
          object = createNamedNode(pattern.object);
        }
      }

      const predicate = createNamedNode(pattern.predicate);

      return createQuad(subject, predicate, object);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to instantiate pattern: ${error.message}`);
      return null;
    }
  }

  return {
    loadRules,
    executeRules,
    chainRules,
    addRule,
    getRules,
    getInferredTriples,
    clearInferredCache,
  };
}
