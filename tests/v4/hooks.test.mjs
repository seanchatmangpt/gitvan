/**
 * GitVan V4 Hooks Tests
 *
 * Comprehensive tests for the V4 hooks system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '../../src/v4/core/signals.js';
import {
  useState,
  useReducer,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useAsync,
  useResource,
  useEvents,
  useToggle,
  useCounter,
  usePrevious,
} from '../../src/v4/core/hooks.js';

describe('V4 Hooks API', () => {
  describe('useState()', () => {
    it('should create state', () => {
      const [state, setState] = useState(0);

      expect(state.value).toBe(0);
    });

    it('should update state', () => {
      const [state, setState] = useState(0);

      setState(5);
      expect(state.value).toBe(5);
    });

    it('should update state with function', () => {
      const [state, setState] = useState(0);

      setState((prev) => prev + 1);
      expect(state.value).toBe(1);
    });

    it('should track previous value', () => {
      const [state, setState] = useState(0);

      setState(5);
      expect(state.previousValue).toBe(0);
    });

    it('should track version', () => {
      const [state, setState] = useState(0);

      expect(state.version).toBe(0);

      setState(1);
      expect(state.version).toBe(1);

      setState(2);
      expect(state.version).toBe(2);
    });

    it('should track updated timestamp', () => {
      const [state, setState] = useState(0);

      const before = state.updatedAt;
      setState(1);
      const after = state.updatedAt;

      expect(after).toBeGreaterThan(before);
    });
  });

  describe('useReducer()', () => {
    it('should create reducer state', () => {
      const reducer = (state, action) => {
        switch (action.type) {
          case 'increment':
            return { count: state.count + 1 };
          case 'decrement':
            return { count: state.count - 1 };
          default:
            return state;
        }
      };

      const [state, dispatch] = useReducer(reducer, { count: 0 });

      expect(state().count).toBe(0);
    });

    it('should dispatch actions', () => {
      const reducer = (state, action) => {
        switch (action.type) {
          case 'increment':
            return { count: state.count + 1 };
          default:
            return state;
        }
      };

      const [state, dispatch] = useReducer(reducer, { count: 0 });

      dispatch({ type: 'increment' });
      expect(state().count).toBe(1);

      dispatch({ type: 'increment' });
      expect(state().count).toBe(2);
    });
  });

  describe('useEffect()', () => {
    it('should run effect', () => {
      let ran = false;

      useEffect(() => {
        ran = true;
      });

      expect(ran).toBe(true);
    });

    it('should track dependencies', () => {
      const count = signal(0);
      const values = [];

      useEffect(() => {
        values.push(count());
      });

      count.set(1);
      count.set(2);

      expect(values).toEqual([0, 1, 2]);
    });

    it('should run cleanup', async () => {
      const count = signal(0);
      let cleanupRan = false;

      const stop = useEffect(() => {
        count();
        return () => {
          cleanupRan = true;
        };
      });

      count.set(1);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(cleanupRan).toBe(true);
    });
  });

  describe('useMemo()', () => {
    it('should memoize value', () => {
      const count = signal(0);
      let computeCount = 0;

      const doubled = useMemo(() => {
        computeCount++;
        return count() * 2;
      });

      doubled();
      doubled();
      doubled();

      expect(computeCount).toBe(1);
    });

    it('should recompute on dependency change', () => {
      const count = signal(0);
      let computeCount = 0;

      const doubled = useMemo(() => {
        computeCount++;
        return count() * 2;
      });

      doubled();
      count.set(5);
      doubled();

      expect(computeCount).toBe(2);
      expect(doubled()).toBe(10);
    });
  });

  describe('useCallback()', () => {
    it('should memoize callback', () => {
      const callback = () => 42;
      const memoized = useCallback(callback);

      expect(memoized).toBe(callback);
    });

    it('should update when deps change', () => {
      let callback1 = () => 1;
      let callback2 = () => 2;

      const memoized1 = useCallback(callback1, [1]);
      const memoized2 = useCallback(callback2, [2]);

      expect(memoized1).toBe(callback1);
      expect(memoized2).toBe(callback2);
    });
  });

  describe('useRef()', () => {
    it('should create ref', () => {
      const ref = useRef(0);

      expect(ref.current).toBe(0);
    });

    it('should be mutable', () => {
      const ref = useRef(0);

      ref.current = 5;
      expect(ref.current).toBe(5);

      ref.current++;
      expect(ref.current).toBe(6);
    });
  });

  describe('useAsync()', () => {
    it('should handle async operation', async () => {
      const { data, isLoading, isSuccess } = useAsync(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 42;
        },
        { immediate: true }
      );

      expect(isLoading).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(data).toBe(42);
      expect(isSuccess).toBe(true);
    });

    it('should handle errors', async () => {
      const { error, isError } = useAsync(
        async () => {
          throw new Error('Test error');
        },
        { immediate: true }
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(isError).toBe(true);
      expect(error?.message).toBe('Test error');
    });

    it('should support refetch', async () => {
      let count = 0;

      const { data, refetch } = useAsync(
        async () => {
          count++;
          return count;
        },
        { immediate: false }
      );

      await refetch();
      expect(data).toBe(1);

      await refetch();
      expect(data).toBe(2);
    });
  });

  describe('useResource()', () => {
    it('should fetch resource', async () => {
      const users = useResource(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ['Alice', 'Bob'];
      });

      expect(users.loading()).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(users()).toEqual(['Alice', 'Bob']);
      expect(users.loading()).toBe(false);
    });

    it('should support refetch', async () => {
      let count = 0;

      const resource = useResource(async () => {
        count++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return count;
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(resource()).toBe(1);

      await resource.refetch();
      expect(resource()).toBe(2);
    });

    it('should support mutation', async () => {
      const resource = useResource(async () => {
        return 'initial';
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(resource()).toBe('initial');

      resource.mutate('updated');
      expect(resource()).toBe('updated');
    });
  });

  describe('useEvents()', () => {
    it('should create event registry', () => {
      const events = useEvents();

      expect(events).toHaveProperty('on');
      expect(events).toHaveProperty('emit');
      expect(events).toHaveProperty('off');
      expect(events).toHaveProperty('once');
    });

    it('should handle events', () => {
      const events = useEvents();
      const values = [];

      events.on('test', (payload) => {
        values.push(payload);
      });

      events.emit('test', 1);
      events.emit('test', 2);

      expect(values).toEqual([1, 2]);
    });

    it('should unsubscribe', () => {
      const events = useEvents();
      const values = [];

      const unsubscribe = events.on('test', (payload) => {
        values.push(payload);
      });

      events.emit('test', 1);
      unsubscribe();
      events.emit('test', 2);

      expect(values).toEqual([1]);
    });

    it('should handle once', () => {
      const events = useEvents();
      const values = [];

      events.once('test', (payload) => {
        values.push(payload);
      });

      events.emit('test', 1);
      events.emit('test', 2);

      expect(values).toEqual([1]);
    });
  });

  describe('useToggle()', () => {
    it('should create toggle state', () => {
      const [value, toggle] = useToggle(false);

      expect(value()).toBe(false);

      toggle();
      expect(value()).toBe(true);

      toggle();
      expect(value()).toBe(false);
    });

    it('should allow explicit setting', () => {
      const [value, toggle, setValue] = useToggle(false);

      setValue(true);
      expect(value()).toBe(true);

      setValue(false);
      expect(value()).toBe(false);
    });
  });

  describe('useCounter()', () => {
    it('should create counter state', () => {
      const { count, increment, decrement, reset } = useCounter(0);

      expect(count()).toBe(0);

      increment();
      expect(count()).toBe(1);

      decrement();
      expect(count()).toBe(0);

      reset();
      expect(count()).toBe(0);
    });

    it('should respect min/max bounds', () => {
      const { count, increment, decrement } = useCounter(5, { min: 0, max: 10 });

      increment();
      increment();
      increment();
      increment();
      increment();
      increment();
      expect(count()).toBe(10);

      decrement();
      decrement();
      decrement();
      decrement();
      decrement();
      decrement();
      decrement();
      decrement();
      decrement();
      decrement();
      decrement();
      expect(count()).toBe(0);
    });
  });

  describe('usePrevious()', () => {
    it('should track previous value', () => {
      const count = signal(0);
      const previous = usePrevious(count);

      expect(previous()).toBeUndefined();

      count.set(1);
      expect(previous()).toBe(0);

      count.set(2);
      expect(previous()).toBe(1);
    });
  });
});
