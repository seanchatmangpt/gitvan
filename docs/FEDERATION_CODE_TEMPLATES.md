# @unrdf/federation Code Templates & Quick Start

**Reference Document:** Companion to `/home/user/gitvan/docs/UNRDF_FEDERATION_INTEGRATION_PLAN.md`
**Purpose:** Copy-paste ready code examples for Phase 1-3 implementation
**Version:** 1.0.0

---

## 1. Peer Registry Implementation

### 1.1 Peer Registry Composable

```javascript
// src/federation/composables/usePeerRegistry.mjs

import { useGitVan } from '../../composables/index.mjs';
import { isomorphic as git } from 'isomorphic-git';
import { parseTurtle, toTurtle } from '../../unrdf-loader.mjs';
import { createLogger } from '../../utils/logger.mjs';

const logger = createLogger('peer-registry');

export function usePeerRegistry() {
  const context = useGitVan();

  return {
    /**
     * Register a new peer in the federation
     */
    async registerPeer(name, endpoint, metadata = {}) {
      const peerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const triple = `
:${peerId} a peer:Peer ;
  peer:name "${name}" ;
  peer:sparqlEndpoint <${endpoint}> ;
  peer:region "${metadata.region || 'unknown'}" ;
  peer:team "${metadata.team || 'unknown'}" ;
  peer:trustLevel "${metadata.trustLevel || 'internal'}" ;
  peer:lastHeartbeat "${new Date().toISOString()}"^^xsd:dateTime ;
  peer:maxLatency ${metadata.maxLatency || 5000} ;
  peer:availability ${metadata.availability || 0.99} ;
  rdfs:comment "${metadata.description || ''}" .
      `.trim();

      try {
        const registryPath = '.gitvan/federation/peers.ttl';

        // Ensure directory exists
        try {
          await git.readFile({ fs: context.fs, dir: context.dir, filepath: registryPath });
        } catch {
          // File doesn't exist, create it with header
          const header = `@prefix peer: <https://gitvan.dev/peer#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# Federation Peer Registry
# Last Updated: ${new Date().toISOString()}

`;
          await git.writeFile({
            fs: context.fs,
            dir: context.dir,
            filepath: registryPath,
            encoding: 'utf8',
            content: header + triple
          });

          return { peerId, success: true, isNewRegistry: true };
        }

        // Append to existing file
        const content = await git.readFile({
          fs: context.fs,
          dir: context.dir,
          filepath: registryPath,
          encoding: 'utf8'
        });

        const updated = content + '\n\n' + triple;

        await git.writeFile({
          fs: context.fs,
          dir: context.dir,
          filepath: registryPath,
          encoding: 'utf8',
          content: updated
        });

        logger.success(`Registered peer: ${name} (${peerId})`);

        return { peerId, success: true };
      } catch (error) {
        logger.error(`Failed to register peer: ${error.message}`);
        throw error;
      }
    },

    /**
     * Load all registered peers
     */
    async loadPeers() {
      const registryPath = '.gitvan/federation/peers.ttl';

      try {
        const content = await git.readFile({
          fs: context.fs,
          dir: context.dir,
          filepath: registryPath,
          encoding: 'utf8'
        });

        // Parse Turtle
        const store = await parseTurtle(content);

        // Query for all peers
        const query = `
PREFIX peer: <https://gitvan.dev/peer#>

SELECT ?peer ?name ?endpoint ?region ?team ?lastHeartbeat WHERE {
  ?peer a peer:Peer ;
        peer:name ?name ;
        peer:sparqlEndpoint ?endpoint ;
        peer:region ?region ;
        peer:team ?team ;
        peer:lastHeartbeat ?lastHeartbeat .
}
ORDER BY DESC(?lastHeartbeat)
        `;

        const results = await store.query(query);
        return results.results.bindings.map(binding => ({
          peerId: binding.peer.value,
          name: binding.name.value,
          endpoint: binding.endpoint.value,
          region: binding.region.value,
          team: binding.team.value,
          lastHeartbeat: binding.lastHeartbeat.value
        }));
      } catch (error) {
        if (error.code === 'ENOENT') {
          logger.info('No peer registry found yet');
          return [];
        }
        throw error;
      }
    },

    /**
     * Discover peers by filter criteria
     */
    async discoverPeers(filter = {}) {
      const peers = await this.loadPeers();

      return peers.filter(peer => {
        if (filter.region && peer.region !== filter.region) return false;
        if (filter.team && peer.team !== filter.team) return false;
        return true;
      });
    },

    /**
     * Monitor peer health by pinging endpoints
     */
    async monitorPeerHealth() {
      const peers = await this.loadPeers();
      const results = {};

      for (const peer of peers) {
        try {
          const start = Date.now();
          const response = await fetch(`${peer.endpoint}?query=ASK{?s ?p ?o}`, {
            method: 'GET',
            timeout: 5000
          });
          const latency = Date.now() - start;

          results[peer.peerId] = {
            status: response.ok ? 'healthy' : 'unhealthy',
            latency,
            lastCheck: new Date().toISOString()
          };
        } catch (error) {
          results[peer.peerId] = {
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date().toISOString()
          };
        }
      }

      return results;
    }
  };
}
```

### 1.2 Unit Tests for Peer Registry

```javascript
// tests/federation/usePeerRegistry.test.mjs

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withGitVan } from '../test-utils.mjs';
import { usePeerRegistry } from '../../src/federation/composables/usePeerRegistry.mjs';

describe('usePeerRegistry', () => {
  it('should register a new peer', async () => {
    await withGitVan(async (context) => {
      const registry = usePeerRegistry();

      const result = await registry.registerPeer(
        'test-repo',
        'https://test.dev/sparql',
        { region: 'us-east', team: 'platform' }
      );

      expect(result.success).toBe(true);
      expect(result.peerId).toBeDefined();
      expect(result.peerId).toMatch(/^peer-/);
    });
  });

  it('should load registered peers', async () => {
    await withGitVan(async (context) => {
      const registry = usePeerRegistry();

      await registry.registerPeer('repo1', 'https://repo1.dev/sparql',
        { region: 'us-east', team: 'api' });
      await registry.registerPeer('repo2', 'https://repo2.dev/sparql',
        { region: 'eu-west', team: 'web' });

      const peers = await registry.loadPeers();

      expect(peers.length).toBeGreaterThanOrEqual(2);
      expect(peers.some(p => p.name === 'repo1')).toBe(true);
      expect(peers.some(p => p.name === 'repo2')).toBe(true);
    });
  });

  it('should discover peers by region', async () => {
    await withGitVan(async (context) => {
      const registry = usePeerRegistry();

      await registry.registerPeer('us-repo', 'https://us.dev/sparql',
        { region: 'us-east' });
      await registry.registerPeer('eu-repo', 'https://eu.dev/sparql',
        { region: 'eu-west' });

      const uspeers = await registry.discoverPeers({ region: 'us-east' });

      expect(uspeers.length).toBeGreaterThanOrEqual(1);
      expect(uspeers.every(p => p.region === 'us-east')).toBe(true);
    });
  });
});
```

---

## 2. Federated SPARQL Client

### 2.1 HTTP SPARQL Client

```javascript
// src/federation/client/FederatedSparqlClient.mjs

import fetch from 'node-fetch';
import { createLogger } from '../../utils/logger.mjs';

const logger = createLogger('federated-sparql-client');

export class FederatedSparqlClient {
  constructor(options = {}) {
    this.peers = new Map();
    this.timeout = options.timeout || 30000;
    this.tlsConfig = options.tlsConfig;
    this.cache = options.cache;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Register a peer endpoint
   */
  registerPeer(name, endpoint, metadata = {}) {
    this.peers.set(name, {
      endpoint,
      ...metadata,
      healthy: true,
      failureCount: 0
    });

    logger.info(`Registered peer: ${name} at ${endpoint}`);
  }

  /**
   * Execute a federated SPARQL query
   */
  async query(sparql, options = {}) {
    const cacheKey = options.cache ? this._getCacheKey(sparql) : null;

    // Check cache first
    if (cacheKey && this.cache) {
      const cached = this.cache.get(sparql);
      if (cached) {
        logger.debug(`Cache hit for query`);
        return cached;
      }
    }

    // Extract SERVICE clauses
    const services = this._extractServices(sparql);

    logger.info(`Executing query with ${services.length} SERVICE clause(s)`);

    if (services.length === 0) {
      // No federation needed
      throw new Error('No SERVICE clauses found - use local SPARQL client');
    }

    // Execute federated query
    const results = {
      results: { bindings: [] },
      head: { vars: [] },
      statistics: {
        totalLatency: 0,
        successfulEndpoints: 0,
        failedEndpoints: 0
      }
    };

    const startTime = Date.now();

    // Execute SERVICE clauses in parallel
    const servicePromises = services.map(service =>
      this._queryRemote(service, options)
    );

    const remoteResults = await Promise.allSettled(servicePromises);

    // Aggregate results
    remoteResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        results.results.bindings.push(...result.value.results.bindings);
        results.statistics.successfulEndpoints++;
      } else {
        results.statistics.failedEndpoints++;
        logger.warn(`Query failed for service ${index}:`, result.reason?.message);
      }
    });

    results.statistics.totalLatency = Date.now() - startTime;

    // Deduplicate results
    const unique = new Map();
    for (const binding of results.results.bindings) {
      const key = JSON.stringify(binding);
      if (!unique.has(key)) {
        unique.set(key, binding);
      }
    }

    results.results.bindings = Array.from(unique.values());

    // Cache result
    if (cacheKey && this.cache) {
      this.cache.set(sparql, results);
    }

    return results;
  }

  /**
   * Execute query against single remote endpoint
   */
  async _queryRemote(service, options = {}) {
    const timeout = options.timeout || this.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let lastError;

    // Retry logic
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(service.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json',
            'User-Agent': 'GitVan-Federation/1.0'
          },
          body: service.query,
          signal: controller.signal,
          ...(this.tlsConfig && { agent: this.tlsConfig })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error;
        logger.warn(`Attempt ${attempt + 1} failed for ${service.endpoint}: ${error.message}`);

        // Exponential backoff
        if (attempt < this.maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 100;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    clearTimeout(timeoutId);
    throw lastError;
  }

  /**
   * Extract SERVICE clauses from SPARQL query
   */
  _extractServices(sparql) {
    const serviceRegex = /SERVICE\s+<([^>]+)>\s*{([^}]+)}/gi;
    const matches = [...sparql.matchAll(serviceRegex)];

    return matches.map(match => ({
      endpoint: match[1],
      query: match[2].trim()
    }));
  }

  /**
   * Generate cache key for query
   */
  _getCacheKey(query) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(query).digest('hex');
  }
}
```

### 2.2 Integration with PredicateEvaluator

```javascript
// Enhancement to src/hooks/PredicateEvaluator.mjs

export class PredicateEvaluator {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.federatedClient = options.federatedClient;  // NEW
  }

  async evaluate(hook, currentGraph, previousGraph = null) {
    const predicate = hook.predicateDefinition;

    switch (predicate.type) {
      case "federated":
        return await this._evaluateFederated(predicate, currentGraph);

      // ... existing cases ...
    }
  }

  /**
   * Evaluate federated predicate
   */
  async _evaluateFederated(predicate, currentGraph) {
    this.logger.info("🌐 Evaluating federated predicate");

    if (!this.federatedClient) {
      throw new Error("Federated client not initialized");
    }

    const query = predicate.definition.query;
    const threshold = predicate.definition.threshold || 0;
    const operator = predicate.definition.operator || ">";

    try {
      // Execute federated query
      const results = await this.federatedClient.query(query, {
        timeout: predicate.definition.timeout || 30000
      });

      // Extract value for threshold comparison
      const value = this._extractNumericValue(results);

      let triggered = false;
      switch (operator) {
        case ">":
          triggered = value > threshold;
          break;
        case ">=":
          triggered = value >= threshold;
          break;
        case "<":
          triggered = value < threshold;
          break;
        case "<=":
          triggered = value <= threshold;
          break;
        case "==":
          triggered = value === threshold;
          break;
        case "!=":
          triggered = value !== threshold;
          break;
      }

      return {
        result: triggered,
        predicateType: 'federated',
        context: {
          query,
          value,
          threshold,
          operator,
          resultCount: this._getResultSize(results),
          statistics: results.statistics
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Federation query failed: ${error.message}`);
      return {
        result: false,
        predicateType: 'federated',
        context: {
          error: error.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}
```

---

## 3. Federated Hook Definition (Turtle)

### 3.1 Example: Fleet Performance Monitor Hook

```turtle
@prefix hook: <https://gitvan.dev/hook#> .
@prefix predicate: <https://gitvan.dev/predicate#> .
@prefix perf: <https://gitvan.dev/performance#> .
@prefix action: <https://gitvan.dev/action#> .

# Hook: Fleet-wide performance anomaly detection
:fleet-performance-hook a hook:Hook ;
  hook:name "Fleet Performance Monitor" ;
  hook:description "Detect performance anomalies across all repositories" ;
  hook:enabled true ;

  # Trigger after performance measurements
  hook:trigger "post-measurement" ;

  # Predicate: federated anomaly detection
  hook:predicateDefinition [
    a predicate:FederatedPredicate ;
    predicate:type "federated" ;
    predicate:description "Count anomalies across fleet" ;

    # SPARQL query to execute across federation
    predicate:query """
      PREFIX perf: <https://gitvan.dev/performance#>

      SELECT (COUNT(?anomaly) AS ?anomalyCount) WHERE {
        # Local anomalies
        ?m1 a perf:Anomaly ;
            perf:severity "high" ;
            perf:timestamp ?t .

        # Remote anomalies in same time window
        {
          SERVICE <https://repo1.dev/sparql> {
            ?m2 a perf:Anomaly ;
                perf:severity "high" ;
                perf:timestamp ?t2 .
            FILTER(ABS(?t2 - ?t) < 60000)
          }
        }
        UNION
        {
          SERVICE <https://repo2.dev/sparql> {
            ?m2 a perf:Anomaly ;
                perf:severity "high" ;
                perf:timestamp ?t2 .
            FILTER(ABS(?t2 - ?t) < 60000)
          }
        }
        UNION
        {
          SERVICE <https://repo3.dev/sparql> {
            ?m2 a perf:Anomaly ;
                perf:severity "high" ;
                perf:timestamp ?t2 .
            FILTER(ABS(?t2 - ?t) < 60000)
          }
        }
      }
    """ ;

    # Threshold: trigger if 3+ anomalies detected
    predicate:threshold 3 ;
    predicate:operator ">" ;

    # Timeout after 30 seconds
    predicate:timeout 30000 ;

    # Federated peer endpoints
    predicate:peers (
      <https://repo1.dev/sparql>
      <https://repo2.dev/sparql>
      <https://repo3.dev/sparql>
    )
  ] ;

  # Action: alert
  hook:action [
    a action:Alert ;
    action:severity "high" ;
    action:message "Fleet-wide anomaly detected: {{anomalyCount}} anomalies across federation" ;
    action:notifyChannels ( "slack" "pagerduty" )
  ] .

# Hook: Pack compatibility checking
:pack-compatibility-hook a hook:Hook ;
  hook:name "Pack Compatibility Checker" ;
  hook:enabled true ;
  hook:trigger "pre-pack-install" ;

  hook:predicateDefinition [
    a predicate:FederatedPredicate ;
    predicate:type "federated" ;
    predicate:query """
      PREFIX pack: <https://gitvan.dev/pack#>

      SELECT ?incompatibleRepo WHERE {
        # Pack being installed
        ?installedPack a pack:Pack ;
                       pack:version ?version ;
                       pack:apiRequirement ?apiVersion .

        # Find incompatible versions across federation
        {
          SERVICE <https://repo1.dev/sparql> {
            ?installedPack pack:version ?existingVersion .
            FILTER(?existingVersion != ?version)
            BIND("repo1" AS ?incompatibleRepo)
          }
        }
        UNION
        {
          SERVICE <https://repo2.dev/sparql> {
            ?installedPack pack:version ?existingVersion .
            FILTER(?existingVersion != ?version)
            BIND("repo2" AS ?incompatibleRepo)
          }
        }
      }
    """ ;
    predicate:threshold 1 ;
    predicate:operator ">=" ;
    predicate:timeout 5000
  ] ;

  hook:action [
    a action:Notification ;
    action:message "Warning: Pack version mismatch detected. Recommend: {{recommendedVersion}}"
  ] .
```

---

## 4. Testing Templates

### 4.1 Federation Integration Test

```javascript
// tests/federation/federation.integration.test.mjs

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withGitVan } from '../test-utils.mjs';
import { usePeerRegistry } from '../../src/federation/composables/usePeerRegistry.mjs';
import { FederatedSparqlClient } from '../../src/federation/client/FederatedSparqlClient.mjs';

describe('Federation Integration', () => {
  let registry;
  let client;

  beforeEach(async () => {
    await withGitVan(async (context) => {
      registry = usePeerRegistry();
      client = new FederatedSparqlClient({
        timeout: 10000
      });
    });
  });

  it('should execute simple federated query', async () => {
    await withGitVan(async (context) => {
      // Register test peers
      await registry.registerPeer('test-repo1',
        'https://test1.dev/sparql',
        { region: 'us-east' }
      );

      client.registerPeer('test-repo1', 'https://test1.dev/sparql');

      // Execute query
      const query = `
        PREFIX perf: <https://gitvan.dev/performance#>
        SELECT ?duration WHERE {
          SERVICE <https://test1.dev/sparql> {
            ?m perf:duration ?duration .
          }
        }
      `;

      // Mock the HTTP response
      global.fetch = async (url, options) => {
        return {
          ok: true,
          json: async () => ({
            results: {
              bindings: [
                { duration: { type: 'literal', value: '123' } }
              ]
            }
          })
        };
      };

      const results = await client.query(query);

      expect(results.results.bindings.length).toBeGreaterThan(0);
      expect(results.statistics.successfulEndpoints).toBeGreaterThan(0);
    });
  });

  it('should handle peer failures gracefully', async () => {
    await withGitVan(async (context) => {
      client.registerPeer('failing-peer',
        'https://failing.dev/sparql'
      );

      // Mock failure
      global.fetch = async () => {
        throw new Error('Connection timeout');
      };

      const query = `
        SELECT ?x WHERE {
          SERVICE <https://failing.dev/sparql> {
            ?x a ?type .
          }
        }
      `;

      // Should return partial results, not crash
      try {
        const results = await client.query(query);
        expect(results).toBeDefined();
      } catch (error) {
        // Expected to fail after retries
        expect(error.message).toMatch(/failed/i);
      }
    });
  });

  it('should cache query results', async () => {
    await withGitVan(async (context) => {
      const LRU = require('lru-cache');
      const cache = new LRU({ max: 100 });

      const cachedClient = new FederatedSparqlClient({
        cache: cache
      });

      cachedClient.registerPeer('test', 'https://test.dev/sparql');

      let callCount = 0;
      global.fetch = async () => {
        callCount++;
        return {
          ok: true,
          json: async () => ({
            results: { bindings: [{ x: { value: 'test' } }] }
          })
        };
      };

      const query = `SELECT ?x WHERE { SERVICE <https://test.dev/sparql> { ?x ?p ?o } }`;

      // First call - hits network
      await cachedClient.query(query, { cache: true });
      expect(callCount).toBe(1);

      // Second call - hits cache
      await cachedClient.query(query, { cache: true });
      expect(callCount).toBe(1);  // No additional network call
    });
  });
});
```

---

## 5. Configuration Examples

### 5.1 Federation Configuration File

```javascript
// .gitvan/federation/config.mjs
// Configuration for federation features

export default {
  // Federation enabled
  enabled: true,

  // Peer registry location
  registryPath: '.gitvan/federation/peers.ttl',

  // SPARQL Client options
  sparql: {
    timeout: 30000,        // 30 second default timeout
    maxRetries: 3,         // Retry failed queries 3 times
    parallelism: 5,        // Execute up to 5 SERVICE clauses in parallel
    cache: {
      enabled: true,
      ttl: 300000,         // 5 minute cache
      maxSize: 1000        // Max 1000 cached queries
    }
  },

  // Network configuration
  network: {
    tls: {
      enabled: true,
      minVersion: 'TLSv1.3',
      rejectUnauthorized: true,
      certPath: '.gitvan/federation/certs/cert.pem',
      keyPath: '.gitvan/federation/certs/key.pem',
      caPath: '.gitvan/federation/certs/ca.pem'
    },
    auth: {
      type: 'jwt',           // JWT-based auth
      issuer: 'gitvan-federation',
      audience: 'gitvan-federation'
    }
  },

  // Peer discovery
  discovery: {
    enabled: true,
    healthCheckInterval: 30000,  // Check peer health every 30 seconds
    heartbeatTimeout: 60000       // Peer timeout after 1 minute no heartbeat
  },

  // Consistency configuration
  consistency: {
    model: 'eventual',     // Eventual consistency
    propagationDelay: 5000,  // Propagate changes within 5 seconds
    conflictResolution: 'last-write-wins'
  },

  // Monitoring
  monitoring: {
    enabled: true,
    metricsPath: '.gitvan/federation/metrics',
    logLevel: 'info'
  }
};
```

---

## 6. Package.json Dependencies

### 6.1 Required Additions to package.json

```json
{
  "dependencies": {
    "@unrdf/federation": "^1.0.0",
    "node-fetch": "^3.3.0",
    "lru-cache": "^10.0.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

---

## 7. CLI Commands (Future)

### 7.1 Federation Management Commands

```bash
# Register a peer
gitvan federation register <name> <endpoint> --region us-east --team platform

# List registered peers
gitvan federation peers list

# Check peer health
gitvan federation peers health

# Execute federated query
gitvan federation query --file query.sparql

# Monitor federation
gitvan federation monitor --interval 30s

# Create federation snapshot
gitvan federation snapshot create

# Restore from snapshot
gitvan federation snapshot restore <snapshot-id>
```

---

## 8. Troubleshooting Guide

### Issue: Federated Query Timeout

**Symptom:** Queries hang for 30 seconds then fail

**Solution:**
```javascript
// Use shorter timeout for interactive queries
const results = await client.query(sparql, {
  timeout: 5000  // 5 second timeout
});

// For longer queries, use batch execution
const results = await client.query(sparql, {
  timeout: 60000,  // 60 second timeout
  parallelism: 2   // Execute 2 SERVICE clauses sequentially
});
```

### Issue: Service Endpoint Returns 500

**Symptom:** One peer consistently fails with HTTP 500

**Mitigation:**
```javascript
// Automatic retry with exponential backoff
const results = await client.query(sparql, {
  maxRetries: 5,
  retryBackoff: 'exponential'
});

// Or skip failing peer temporarily
const peers = await registry.discoverPeers();
const healthyPeers = peers.filter(p => p.healthy);
```

### Issue: Results Inconsistent Across Peers

**Symptom:** Different results from different peers for same query

**Solution:** Use CONSTRUCT to normalize results
```sparql
PREFIX perf: <https://gitvan.dev/performance#>

CONSTRUCT {
  ?measurement a perf:NormalizedMeasurement ;
    perf:value ?value ;
    perf:normalizedAt ?now .
}
WHERE {
  SERVICE <https://repo1.dev/sparql> {
    ?measurement perf:value ?rawValue .
  }
  BIND((?rawValue * 1000) AS ?value)
  BIND(NOW() AS ?now)
}
```

---

## Next Steps

1. **Copy templates** into your project
2. **Install dependencies** from section 6.1
3. **Implement Phase 1** using section 1 (Peer Registry)
4. **Write tests** using section 4.1 as template
5. **Configure** using section 5.1
6. **Deploy** step by step, testing each component

---

**Last Updated:** January 10, 2026
**Status:** Ready for Implementation
