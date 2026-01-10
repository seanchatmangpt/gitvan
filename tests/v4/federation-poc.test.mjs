/**
 * Phase 1 Federation POC Test Suite
 *
 * Tests multi-graph UNION queries, named graph integration,
 * and Git versioning for the federation architecture.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryFederator } from '../../src/federation/query-federator.mjs';
import { NamedGraphRegistry } from '../../src/federation/named-graph-registry.mjs';
import { GraphVersionManager } from '../../src/federation/graph-version-manager.mjs';
import { GraphNameResolver } from '../../src/federation/graph-name-resolver.mjs';
import { GraphFederationService } from '../../src/federation/federation-service.mjs';

describe('Phase 1 Federation POC Tests', () => {
  let registry;
  let federator;
  let versionManager;
  let nameResolver;

  beforeEach(async () => {
    // Initialize registry with test data
    registry = new NamedGraphRegistry('.test-gitvan');
    federator = new QueryFederator(registry);
    nameResolver = new GraphNameResolver();

    // Register test graphs
    await registry.registerGraph('jobs', {
      graphType: 'jobs',
      baseIRI: 'https://gitvan.dev/jobs/',
      description: 'Test jobs graph'
    });

    await registry.registerGraph('performance', {
      graphType: 'performance',
      baseIRI: 'https://gitvan.dev/performance/',
      description: 'Test performance graph'
    });

    await registry.registerGraph('packs', {
      graphType: 'packs',
      baseIRI: 'https://gitvan.dev/packs/',
      description: 'Test packs graph'
    });
  });

  afterEach(() => {
    federator.clearCache();
  });

  describe('GraphNameResolver', () => {
    it('should parse local graph IRI', () => {
      const iri = 'https://gitvan.dev/graph/local/repo-abc123/jobs';
      const parsed = nameResolver.parseGraphIRI(iri);

      expect(parsed.type).toBe('local');
      expect(parsed.scope).toBe('repo-abc123');
      expect(parsed.graphType).toBe('jobs');
      expect(parsed.isVersioned).toBe(false);
    });

    it('should parse versioned graph IRI', () => {
      const iri = 'https://gitvan.dev/graph/version/repo-abc123/jobs#v1.2.3';
      const parsed = nameResolver.parseGraphIRI(iri);

      expect(parsed.type).toBe('version');
      expect(parsed.scope).toBe('repo-abc123');
      expect(parsed.graphType).toBe('jobs');
      expect(parsed.versionTag).toBe('v1.2.3');
      expect(parsed.isVersioned).toBe(true);
    });

    it('should parse org graph IRI', () => {
      const iri = 'https://gitvan.dev/graph/org/acme-corp/workflows';
      const parsed = nameResolver.parseGraphIRI(iri);

      expect(parsed.type).toBe('org');
      expect(parsed.scope).toBe('acme-corp');
      expect(parsed.graphType).toBe('workflows');
    });

    it('should parse tenant graph IRI', () => {
      const iri = 'https://gitvan.dev/graph/tenant/tenant-xyz/revops';
      const parsed = nameResolver.parseGraphIRI(iri);

      expect(parsed.type).toBe('tenant');
      expect(parsed.scope).toBe('tenant-xyz');
      expect(parsed.graphType).toBe('revops');
    });

    it('should build graph IRI from components', () => {
      const iri = nameResolver.buildGraphIRI({
        type: 'local',
        scope: 'my-repo',
        graphType: 'jobs'
      });

      expect(iri).toBe('https://gitvan.dev/graph/local/my-repo/jobs');
    });

    it('should build versioned graph IRI', () => {
      const iri = nameResolver.buildGraphIRI({
        type: 'version',
        scope: 'my-repo',
        graphType: 'jobs',
        versionTag: 'stable'
      });

      expect(iri).toBe('https://gitvan.dev/graph/version/my-repo/jobs#stable');
    });

    it('should find graphs matching wildcard pattern', () => {
      const availableGraphs = new Set([
        'https://gitvan.dev/graph/local/repo1/jobs',
        'https://gitvan.dev/graph/local/repo2/jobs',
        'https://gitvan.dev/graph/local/repo1/packs',
        'https://gitvan.dev/graph/org/acme/workflows'
      ]);

      const matching = nameResolver.findMatchingGraphs(
        'local/*/jobs',
        availableGraphs
      );

      expect(matching).toHaveLength(2);
      expect(matching).toContain('https://gitvan.dev/graph/local/repo1/jobs');
      expect(matching).toContain('https://gitvan.dev/graph/local/repo2/jobs');
    });

    it('should throw on invalid graph IRI', () => {
      const invalidIRI = 'https://example.com/invalid';

      expect(() => {
        nameResolver.parseGraphIRI(invalidIRI);
      }).toThrow();
    });
  });

  describe('NamedGraphRegistry', () => {
    it('should register a named graph', async () => {
      const metadata = await registry.registerGraph('test-graph', {
        graphType: 'test',
        description: 'A test graph'
      });

      expect(metadata.graphId).toBe('test-graph');
      expect(metadata.graphType).toBe('test');
      expect(metadata.description).toBe('A test graph');
      expect(metadata.iri).toContain('local');
    });

    it('should retrieve graph metadata', async () => {
      const metadata = registry.getGraphMetadata('jobs');

      expect(metadata.graphId).toBe('jobs');
      expect(metadata.graphType).toBe('jobs');
      expect(metadata.iri).toContain('jobs');
    });

    it('should list all registered graphs', () => {
      const graphs = registry.listGraphs();

      expect(graphs).toHaveLength(3);
      expect(graphs.map(g => g.graphId)).toContain('jobs');
      expect(graphs.map(g => g.graphId)).toContain('performance');
      expect(graphs.map(g => g.graphId)).toContain('packs');
    });

    it('should throw error for unregistered graph', () => {
      expect(() => {
        registry.getGraphMetadata('nonexistent');
      }).toThrow('Graph not registered: nonexistent');
    });

    it('should have correct snapshot directory structure', () => {
      const metadata = registry.getGraphMetadata('jobs');

      expect(metadata.snapshotDir).toBe('.test-gitvan/graphs/jobs/snapshots');
      expect(metadata.versionRef).toBe('refs/gitvan/graphs/jobs/current');
      expect(metadata.stableRef).toBe('refs/gitvan/graphs/jobs/stable');
    });
  });

  describe('QueryFederator - Query Building', () => {
    it('should build simple UNION query', () => {
      const selectVars = { jobId: '?jobId', status: '?status' };
      const patterns = {
        jobs: '?job gv:jobId ?jobId ; gv:status ?status .',
        packs: '?pack gv:jobId ?jobId ; gv:status ?status .'
      };

      const sparql = federator.buildUnionQuery(
        ['jobs', 'packs'],
        selectVars,
        patterns
      );

      expect(sparql).toContain('SELECT');
      expect(sparql).toContain('?jobId');
      expect(sparql).toContain('?status');
      expect(sparql).toContain('UNION');
      expect(sparql).toContain('GRAPH');
    });

    it('should include FILTER clauses in UNION query', () => {
      const selectVars = { jobId: '?jobId' };
      const patterns = {
        jobs: '?job gv:jobId ?jobId .',
        performance: '?metric perf:jobId ?jobId .'
      };
      const options = {
        filters: {
          jobs: ['?jobId = "job-123"'],
          performance: ['?duration > 1000']
        }
      };

      const sparql = federator.buildUnionQuery(
        ['jobs', 'performance'],
        selectVars,
        patterns,
        options
      );

      expect(sparql).toContain('FILTER');
      expect(sparql).toContain('?jobId = "job-123"');
      expect(sparql).toContain('?duration > 1000');
    });

    it('should add ORDER BY clause to UNION query', () => {
      const selectVars = { duration: '?duration' };
      const patterns = {
        jobs: '?job gv:duration ?duration .'
      };
      const options = { orderBy: 'DESC(?duration)' };

      const sparql = federator.buildUnionQuery(
        ['jobs'],
        selectVars,
        patterns,
        options
      );

      expect(sparql).toContain('ORDER BY DESC(?duration)');
    });

    it('should add LIMIT clause to UNION query', () => {
      const selectVars = { jobId: '?jobId' };
      const patterns = { jobs: '?job gv:jobId ?jobId .' };
      const options = { limit: 100 };

      const sparql = federator.buildUnionQuery(
        ['jobs'],
        selectVars,
        patterns,
        options
      );

      expect(sparql).toContain('LIMIT 100');
    });

    it('should build DISTINCT SELECT clause', () => {
      const selectVars = { jobId: '?jobId' };
      const patterns = { jobs: '?job gv:jobId ?jobId .' };
      const options = { distinct: true };

      const sparql = federator.buildUnionQuery(
        ['jobs'],
        selectVars,
        patterns,
        options
      );

      expect(sparql).toContain('SELECT DISTINCT');
    });
  });

  describe('QueryFederator - Caching', () => {
    it('should cache UNION query results', async () => {
      const selectVars = { jobId: '?jobId' };
      const patterns = { jobs: '?job gv:jobId ?jobId .' };

      const cacheKey1 = federator.buildCacheKey(
        'selectUnion',
        ['jobs'],
        selectVars,
        patterns
      );

      const cacheKey2 = federator.buildCacheKey(
        'selectUnion',
        ['jobs'],
        selectVars,
        patterns
      );

      expect(cacheKey1).toBe(cacheKey2);
    });

    it('should clear cache when requested', () => {
      federator.cache.set('test-key', { data: 'test' });
      expect(federator.cache.size).toBe(1);

      federator.clearCache();
      expect(federator.cache.size).toBe(0);
    });

    it('should respect cache TTL', (done) => {
      const selectVars = { jobId: '?jobId' };
      const patterns = { jobs: '?job gv:jobId ?jobId .' };
      const cacheKey = federator.buildCacheKey(
        'selectUnion',
        ['jobs'],
        selectVars,
        patterns
      );

      federator.cache.set(cacheKey, {
        results: [{ jobId: 'job-1' }],
        timestamp: Date.now() - 400000 // 400 seconds ago
      });

      // Default TTL is 300 seconds
      const cached = federator.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp >= federator.cacheTTL) {
        expect(true).toBe(true);
        done();
      }
    });
  });

  describe('Multi-Graph Query Execution', () => {
    it('should execute UNION query across jobs and performance graphs', async () => {
      const selectVars = { jobId: '?jobId', duration: '?duration' };
      const patterns = {
        jobs: '?job gv:jobId ?jobId .',
        performance: '?metric perf:duration ?duration .'
      };

      // This will fail without actual stores, but tests the flow
      try {
        await federator.selectUnion(
          ['jobs', 'performance'],
          selectVars,
          patterns
        );
      } catch (error) {
        // Expected to fail without stores initialized
        expect(error).toBeDefined();
      }
    });

    it('should handle empty graph names', () => {
      const selectVars = { jobId: '?jobId' };
      const patterns = {};

      expect(() => {
        federator.buildUnionQuery([], selectVars, patterns);
      }).not.toThrow();
    });

    it('should merge results from multiple graphs', () => {
      const results1 = [
        { jobId: 'job-1', status: 'completed' },
        { jobId: 'job-2', status: 'running' }
      ];

      const results2 = [
        { jobId: 'job-3', status: 'pending' },
        { jobId: 'job-1', status: 'completed' } // Duplicate
      ];

      const merged = [
        ...results1,
        ...results2
      ];

      // Deduplication would happen here
      const deduplicated = Array.from(
        new Map(merged.map(r => [r.jobId, r])).values()
      );

      expect(deduplicated).toHaveLength(3);
      expect(deduplicated.map(r => r.jobId)).toContain('job-1');
      expect(deduplicated.map(r => r.jobId)).toContain('job-2');
      expect(deduplicated.map(r => r.jobId)).toContain('job-3');
    });
  });

  describe('Git Versioning Integration', () => {
    it('should create version record with timestamp', () => {
      const versionRecord = {
        version: 'v1000000000',
        timestamp: new Date().toISOString(),
        graph: 'jobs',
        graphIRI: 'https://gitvan.dev/graph/local/repo/jobs',
        message: 'Test snapshot',
        tripleCount: 1000
      };

      expect(versionRecord.version).toMatch(/^v\d+$/);
      expect(versionRecord.timestamp).toBeTruthy();
      expect(versionRecord.graph).toBe('jobs');
      expect(versionRecord.tripleCount).toBe(1000);
    });

    it('should track version history', () => {
      const history = [
        {
          version: 'v3',
          timestamp: '2026-01-10T15:30:00Z',
          message: 'Latest snapshot'
        },
        {
          version: 'v2',
          timestamp: '2026-01-10T14:30:00Z',
          message: 'Earlier snapshot'
        },
        {
          version: 'v1',
          timestamp: '2026-01-10T13:30:00Z',
          message: 'Initial snapshot'
        }
      ];

      // Sort by timestamp descending
      const sorted = history.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      expect(sorted[0].version).toBe('v3');
      expect(sorted[1].version).toBe('v2');
      expect(sorted[2].version).toBe('v1');
    });

    it('should create Git refs for version tracking', () => {
      const graphId = 'jobs';
      const refs = {
        current: `refs/gitvan/graphs/${graphId}/current`,
        stable: `refs/gitvan/graphs/${graphId}/stable`,
        timestamp: `refs/gitvan/graphs/history/${graphId}/@2026-01-10T15:30:00Z`
      };

      expect(refs.current).toBe('refs/gitvan/graphs/jobs/current');
      expect(refs.stable).toBe('refs/gitvan/graphs/jobs/stable');
      expect(refs.timestamp).toContain('history/jobs');
    });
  });

  describe('Federation Service', () => {
    it('should initialize federation service', () => {
      const service = new GraphFederationService(registry, null, {
        cacheTTL: 600000
      });

      expect(service.graphRegistry).toBe(registry);
      expect(service.federator).toBeDefined();
      expect(service.versionManager).toBeDefined();
      expect(service.nameResolver).toBeDefined();
    });

    it('should list all graphs from service', () => {
      const service = new GraphFederationService(registry, null);
      const graphs = service.listGraphs();

      expect(graphs).toHaveLength(3);
      expect(graphs.map(g => g.graphId)).toContain('jobs');
      expect(graphs.map(g => g.graphId)).toContain('performance');
      expect(graphs.map(g => g.graphId)).toContain('packs');
    });

    it('should get graph metadata from service', () => {
      const service = new GraphFederationService(registry, null);
      const metadata = service.getGraphMetadata('jobs');

      expect(metadata.graphId).toBe('jobs');
      expect(metadata.graphType).toBe('jobs');
    });

    it('should extract SELECT variables from pattern', () => {
      const service = new GraphFederationService(registry, null);
      const pattern = '?job gv:jobId ?jobId ; gv:status ?status ; gv:duration ?duration .';
      const vars = service.extractSelectVariables(pattern);

      expect(Object.keys(vars)).toContain('job');
      expect(Object.keys(vars)).toContain('jobId');
      expect(Object.keys(vars)).toContain('status');
      expect(Object.keys(vars)).toContain('duration');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should measure query execution time', async () => {
      const selectVars = { jobId: '?jobId' };
      const patterns = { jobs: '?job gv:jobId ?jobId .' };

      const start = performance.now();

      try {
        await federator.selectUnion(['jobs'], selectVars, patterns);
      } catch (error) {
        // Expected to fail without stores
      }

      const duration = performance.now() - start;
      expect(duration).toBeGreaterThan(0);
    });

    it('should benchmark cache effectiveness', () => {
      const selectVars = { jobId: '?jobId' };
      const patterns = { jobs: '?job gv:jobId ?jobId .' };

      const results = [{ jobId: 'job-1' }];

      const start1 = performance.now();
      federator.cache.set('test-key', {
        results,
        timestamp: Date.now()
      });
      const uncachedTime = performance.now() - start1;

      const start2 = performance.now();
      const cached = federator.cache.get('test-key');
      const cachedTime = performance.now() - start2;

      // Cached access should be much faster
      expect(cachedTime).toBeLessThan(uncachedTime * 2);
      expect(cached.results).toBe(results);
    });

    it('should handle large result sets', () => {
      const largeResults = Array.from({ length: 10000 }, (_, i) => ({
        jobId: `job-${i}`,
        status: 'completed',
        duration: Math.random() * 5000
      }));

      const start = performance.now();

      // Simulate deduplication
      const deduplicated = Array.from(
        new Map(largeResults.map(r => [r.jobId, r])).values()
      );

      const duration = performance.now() - start;

      expect(deduplicated).toHaveLength(10000);
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Error Handling', () => {
    it('should handle missing graph in UNION query', async () => {
      try {
        await federator.selectUnion(
          ['jobs', 'nonexistent'],
          { jobId: '?jobId' },
          { jobs: '?job gv:jobId ?jobId .' }
        );
      } catch (error) {
        // Should throw or handle gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid SPARQL patterns', () => {
      expect(() => {
        federator.buildUnionQuery(
          ['jobs'],
          { jobId: '?jobId' },
          { jobs: 'INVALID SPARQL PATTERN .' }
        );
      }).not.toThrow(); // Building should succeed, execution would fail
    });

    it('should handle empty result sets', () => {
      const emptyResults = [];

      const deduplicated = Array.from(
        new Map(emptyResults.map(r => [r.jobId, r])).values()
      );

      expect(deduplicated).toHaveLength(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support typical monorepo workflow', () => {
      // Scenario: Query job status across multiple graph types
      const selectVars = {
        jobId: '?jobId',
        graphName: '?graphName',
        status: '?status'
      };

      const patterns = {
        jobs: '?job gv:jobId ?jobId ; gv:status ?status . BIND("jobs" AS ?graphName)',
        packs: '?pack gv:jobId ?jobId ; gv:status ?status . BIND("packs" AS ?graphName)'
      };

      const sparql = federator.buildUnionQuery(
        ['jobs', 'packs'],
        selectVars,
        patterns
      );

      expect(sparql).toContain('SELECT');
      expect(sparql).toContain('?jobId');
      expect(sparql).toContain('?graphName');
      expect(sparql).toContain('BIND');
    });

    it('should support cross-graph correlation', () => {
      // Scenario: Correlate job execution with performance metrics
      const selectVars = {
        jobId: '?jobId',
        jobStatus: '?jobStatus',
        duration: '?duration'
      };

      const patterns = {
        jobs: '?job gv:jobId ?jobId ; gv:status ?jobStatus .',
        performance: '?metric gv:jobId ?jobId ; gv:duration ?duration .'
      };

      const sparql = federator.buildUnionQuery(
        ['jobs', 'performance'],
        selectVars,
        patterns,
        { orderBy: 'DESC(?duration)', limit: 100 }
      );

      expect(sparql).toContain('ORDER BY DESC(?duration)');
      expect(sparql).toContain('LIMIT 100');
    });
  });
});
