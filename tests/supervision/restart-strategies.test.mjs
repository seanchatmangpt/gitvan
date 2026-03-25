// tests/supervision/restart-strategies.test.mjs
import { describe, it } from 'vitest';
import { assert } from 'vitest';
import { getBackoffDelay, shouldRestart, RestartStrategies, ErrorTypes, getDependents } from '../../src/supervision/restart-strategies.mjs';

describe('RestartStrategies', () => {
  describe('getBackoffDelay', () => {
    it('should calculate exponential backoff', () => {
      assert.equal(getBackoffDelay(0, [1000, 5000, 10000]), 1000);
      assert.equal(getBackoffDelay(1, [1000, 5000, 10000]), 5000);
      assert.equal(getBackoffDelay(2, [1000, 5000, 10000]), 10000);
    });

    it('should use default schedule when not provided', () => {
      assert.equal(getBackoffDelay(0), 1000);
      assert.equal(getBackoffDelay(1), 5000);
      assert.equal(getBackoffDelay(2), 10000);
    });

    it('should cap at max schedule value', () => {
      assert.equal(getBackoffDelay(5, [1000, 5000]), 5000);
    });
  });

  describe('shouldRestart', () => {
    it('should return true for transient errors', () => {
      const transientErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE'];
      for (const code of transientErrors) {
        const error = new Error(code);
        error.code = code;
        assert.equal(shouldRestart(error), true, `Should restart for ${code}`);
      }
    });

    it('should return false for permanent errors', () => {
      const permanentErrors = ['EINVAL', 'ENOENT', 'EACCES', 'EPERM'];
      for (const code of permanentErrors) {
        const error = new Error(code);
        error.code = code;
        assert.equal(shouldRestart(error), false, `Should not restart for ${code}`);
      }
    });

    it('should return false for unknown errors', () => {
      const error = new Error('UNKNOWN_ERROR');
      error.code = 'UNKNOWN_ERROR';
      assert.equal(shouldRestart(error), false);
    });

    it('should return false for null/undefined error', () => {
      assert.equal(shouldRestart(null), false);
      assert.equal(shouldRestart(undefined), false);
    });

    it('should extract code from error message', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      assert.equal(shouldRestart(error), true);
    });
  });

  describe('getDependents', () => {
    it('should find dependent children', () => {
      const children = new Map([
        ['child-1', { id: 'child-1' }],
        ['child-2', { id: 'child-2' }],
        ['child-3', { id: 'child-3' }]
      ]);
      const dependencies = {
        'child-2': ['child-1'],
        'child-3': ['child-2']
      };
      const dependents = getDependents(children, 'child-1', dependencies);
      assert.deepEqual(dependents, ['child-2']);
    });

    it('should return empty array when no dependents', () => {
      const children = new Map([
        ['child-1', { id: 'child-1' }]
      ]);
      const dependents = getDependents(children, 'child-1', {});
      assert.deepEqual(dependents, []);
    });

    it('should validate dependents exist in children map', () => {
      const children = new Map([
        ['child-1', { id: 'child-1' }],
        ['child-3', { id: 'child-3' }]
      ]);
      const dependencies = {
        'child-2': ['child-1'],  // child-2 doesn't exist in children
        'child-3': ['child-1']
      };
      const dependents = getDependents(children, 'child-1', dependencies);
      // Should only return child-3 (child-2 is not in children map)
      assert.deepEqual(dependents, ['child-3']);
    });
  });

  describe('exports', () => {
    it('should export RestartStrategies constants', () => {
      assert.equal(RestartStrategies.ONE_FOR_ONE, 'one_for_one');
      assert.equal(RestartStrategies.ONE_FOR_ALL, 'one_for_all');
      assert.equal(RestartStrategies.REST_FOR_ONE, 'rest_for_one');
    });

    it('should export ErrorTypes constants', () => {
      assert.isArray(ErrorTypes.TRANSIENT);
      assert.isArray(ErrorTypes.PERMANENT);
      assert.isArray(ErrorTypes.CRASH);
      assert.include(ErrorTypes.TRANSIENT, 'ECONNREFUSED');
      assert.include(ErrorTypes.PERMANENT, 'EINVAL');
    });
  });
});
