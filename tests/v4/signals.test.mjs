/**
 * GitVan V4 Signals Tests
 *
 * Comprehensive tests for the V4 reactive signals system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  signal,
  computed,
  effect,
  watch,
  batch,
  untrack,
  isTracking,
  createToggle,
  createCounter,
  createList,
  createMap,
  createSet,
} from '../../src/v4/core/signals.js';

describe('V4 Signals API', () => {
  describe('signal()', () => {
    it('should create a writable signal', () => {
      const count = signal(0);
      expect(count()).toBe(0);
    });

    it('should update signal value', () => {
      const count = signal(0);
      count.set(5);
      expect(count()).toBe(5);
    });

    it('should update signal using update function', () => {
      const count = signal(0);
      count.update((v) => v + 1);
      expect(count()).toBe(1);
    });

    it('should reset to initial value', () => {
      const count = signal(0);
      count.set(10);
      count.reset();
      expect(count()).toBe(0);
    });

    it('should peek without tracking', () => {
      const count = signal(0);
      const value = count.peek();
      expect(value).toBe(0);
      expect(isTracking()).toBe(false);
    });

    it('should check if value is defined', () => {
      const value = signal(null);
      expect(value.isDefined()).toBe(false);

      value.set('hello');
      expect(value.isDefined()).toBe(true);
    });

    it('should subscribe to changes', () => {
      const count = signal(0);
      const values = [];

      count.subscribe((v) => values.push(v));

      count.set(1);
      count.set(2);

      expect(values).toEqual([1, 2]);
    });

    it('should unsubscribe properly', () => {
      const count = signal(0);
      const values = [];

      const unsubscribe = count.subscribe((v) => values.push(v));

      count.set(1);
      unsubscribe();
      count.set(2);

      expect(values).toEqual([1]);
    });
  });

  describe('computed()', () => {
    it('should create a computed signal', () => {
      const count = signal(0);
      const doubled = computed(() => count() * 2);

      expect(doubled()).toBe(0);
    });

    it('should update when dependency changes', () => {
      const count = signal(0);
      const doubled = computed(() => count() * 2);

      expect(doubled()).toBe(0);

      count.set(5);
      expect(doubled()).toBe(10);
    });

    it('should cache computed value', () => {
      const count = signal(0);
      let computeCount = 0;

      const doubled = computed(() => {
        computeCount++;
        return count() * 2;
      });

      doubled();
      doubled();
      doubled();

      expect(computeCount).toBe(1);
    });

    it('should recompute when dependency changes', () => {
      const count = signal(0);
      let computeCount = 0;

      const doubled = computed(() => {
        computeCount++;
        return count() * 2;
      });

      doubled();
      count.set(5);
      doubled();

      expect(computeCount).toBe(2);
    });

    it('should support multiple dependencies', () => {
      const a = signal(2);
      const b = signal(3);
      const sum = computed(() => a() + b());

      expect(sum()).toBe(5);

      a.set(5);
      expect(sum()).toBe(8);

      b.set(10);
      expect(sum()).toBe(15);
    });

    it('should peek without recomputing', () => {
      const count = signal(0);
      const doubled = computed(() => count() * 2);

      count.set(5);
      const value = doubled.peek();

      expect(value).toBe(10);
    });
  });

  describe('effect()', () => {
    it('should run effect immediately', () => {
      let ran = false;

      effect(() => {
        ran = true;
      });

      expect(ran).toBe(true);
    });

    it('should track dependencies', () => {
      const count = signal(0);
      const values = [];

      effect(() => {
        values.push(count());
      });

      count.set(1);
      count.set(2);

      // Initial run + 2 updates
      expect(values).toEqual([0, 1, 2]);
    });

    it('should return disposer function', () => {
      const count = signal(0);
      const values = [];

      const stop = effect(() => {
        values.push(count());
      });

      count.set(1);
      stop();
      count.set(2);

      expect(values).toEqual([0, 1]);
    });

    it('should support async effects', async () => {
      const count = signal(0);
      const values = [];

      effect(async () => {
        await Promise.resolve();
        values.push(count());
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      count.set(1);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(values.length).toBeGreaterThan(0);
    });
  });

  describe('watch()', () => {
    it('should watch signal changes', () => {
      const count = signal(0);
      const changes = [];

      watch(count, (value, prev) => {
        changes.push({ value, prev });
      });

      count.set(1);
      count.set(2);

      expect(changes).toHaveLength(2);
      expect(changes[0]).toEqual({ value: 1, prev: undefined });
      expect(changes[1]).toEqual({ value: 2, prev: 1 });
    });

    it('should support immediate option', () => {
      const count = signal(5);
      const values = [];

      watch(
        count,
        (value) => {
          values.push(value);
        },
        { immediate: true }
      );

      expect(values).toEqual([5]);
    });

    it('should return disposer', () => {
      const count = signal(0);
      const values = [];

      const stop = watch(count, (value) => {
        values.push(value);
      });

      count.set(1);
      stop();
      count.set(2);

      expect(values).toEqual([1]);
    });
  });

  describe('batch()', () => {
    it('should batch multiple updates', () => {
      const a = signal(0);
      const b = signal(0);
      let effectCount = 0;

      effect(() => {
        a();
        b();
        effectCount++;
      });

      batch(() => {
        a.set(1);
        b.set(2);
      });

      // Initial effect + 1 batched update
      expect(effectCount).toBe(2);
    });

    it('should return value from batch function', () => {
      const result = batch(() => {
        return 42;
      });

      expect(result).toBe(42);
    });
  });

  describe('untrack()', () => {
    it('should not track dependencies', () => {
      const count = signal(0);
      const values = [];

      effect(() => {
        values.push(untrack(() => count()));
      });

      count.set(1);
      count.set(2);

      // Only initial effect, no re-runs
      expect(values).toEqual([0]);
    });
  });

  describe('createToggle()', () => {
    it('should create toggle signal', () => {
      const [value, toggle] = createToggle(false);

      expect(value()).toBe(false);

      toggle();
      expect(value()).toBe(true);

      toggle();
      expect(value()).toBe(false);
    });

    it('should allow explicit setting', () => {
      const [value, , setValue] = createToggle(false);

      setValue(true);
      expect(value()).toBe(true);

      setValue(false);
      expect(value()).toBe(false);
    });
  });

  describe('createCounter()', () => {
    it('should create counter signal', () => {
      const counter = createCounter(0);

      expect(counter.value()).toBe(0);

      counter.increment();
      expect(counter.value()).toBe(1);

      counter.decrement();
      expect(counter.value()).toBe(0);
    });

    it('should respect min/max bounds', () => {
      const counter = createCounter(5, { min: 0, max: 10 });

      counter.increment(10);
      expect(counter.value()).toBe(10);

      counter.decrement(20);
      expect(counter.value()).toBe(0);
    });

    it('should support custom step', () => {
      const counter = createCounter(0, { step: 5 });

      counter.increment();
      expect(counter.value()).toBe(5);

      counter.increment();
      expect(counter.value()).toBe(10);
    });

    it('should reset to initial value', () => {
      const counter = createCounter(5);

      counter.increment(10);
      expect(counter.value()).toBe(15);

      counter.reset();
      expect(counter.value()).toBe(5);
    });
  });

  describe('createList()', () => {
    it('should create list signal', () => {
      const list = createList(['a', 'b']);

      expect(list.value()).toEqual(['a', 'b']);
    });

    it('should push items', () => {
      const list = createList(['a']);

      list.push('b', 'c');
      expect(list.value()).toEqual(['a', 'b', 'c']);
    });

    it('should pop items', () => {
      const list = createList(['a', 'b', 'c']);

      const item = list.pop();
      expect(item).toBe('c');
      expect(list.value()).toEqual(['a', 'b']);
    });

    it('should remove items', () => {
      const list = createList(['a', 'b', 'c']);

      const removed = list.remove('b');
      expect(removed).toBe(true);
      expect(list.value()).toEqual(['a', 'c']);
    });

    it('should remove at index', () => {
      const list = createList(['a', 'b', 'c']);

      const item = list.removeAt(1);
      expect(item).toBe('b');
      expect(list.value()).toEqual(['a', 'c']);
    });

    it('should filter items', () => {
      const list = createList([1, 2, 3, 4, 5]);

      list.filter((n) => n % 2 === 0);
      expect(list.value()).toEqual([2, 4]);
    });

    it('should map items', () => {
      const list = createList([1, 2, 3]);

      list.map((n) => n * 2);
      expect(list.value()).toEqual([2, 4, 6]);
    });

    it('should clear list', () => {
      const list = createList(['a', 'b', 'c']);

      list.clear();
      expect(list.value()).toEqual([]);
    });
  });

  describe('createMap()', () => {
    it('should create map signal', () => {
      const map = createMap();

      expect(map.value() instanceof Map).toBe(true);
    });

    it('should set and get values', () => {
      const map = createMap();

      map.set('a', 1);
      expect(map.get('a')).toBe(1);
    });

    it('should check if key exists', () => {
      const map = createMap();

      map.set('a', 1);
      expect(map.has('a')).toBe(true);
      expect(map.has('b')).toBe(false);
    });

    it('should delete keys', () => {
      const map = createMap();

      map.set('a', 1);
      const deleted = map.delete('a');

      expect(deleted).toBe(true);
      expect(map.has('a')).toBe(false);
    });

    it('should get keys, values, entries', () => {
      const map = createMap();

      map.set('a', 1);
      map.set('b', 2);

      expect(map.keys()).toEqual(['a', 'b']);
      expect(map.values()).toEqual([1, 2]);
      expect(map.entries()).toEqual([['a', 1], ['b', 2]]);
    });

    it('should clear map', () => {
      const map = createMap();

      map.set('a', 1);
      map.set('b', 2);
      map.clear();

      expect(map.keys()).toEqual([]);
    });
  });

  describe('createSet()', () => {
    it('should create set signal', () => {
      const set = createSet();

      expect(set.value() instanceof Set).toBe(true);
    });

    it('should add values', () => {
      const set = createSet();

      set.add('a');
      expect(set.has('a')).toBe(true);
    });

    it('should delete values', () => {
      const set = createSet();

      set.add('a');
      const deleted = set.delete('a');

      expect(deleted).toBe(true);
      expect(set.has('a')).toBe(false);
    });

    it('should get values', () => {
      const set = createSet();

      set.add('a');
      set.add('b');

      expect(set.values()).toEqual(['a', 'b']);
    });

    it('should clear set', () => {
      const set = createSet();

      set.add('a');
      set.add('b');
      set.clear();

      expect(set.values()).toEqual([]);
    });
  });
});
