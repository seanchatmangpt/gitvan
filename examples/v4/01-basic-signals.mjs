/**
 * GitVan V4 Example: Basic Signals
 *
 * Demonstrates core signal primitives, computed values, and effects.
 */

import {
  signal,
  computed,
  effect,
  watch,
  batch,
  createCounter,
  createToggle,
} from '../../src/v4/index.ts';

console.log('=== GitVan V4: Basic Signals Example ===\n');

// ============================================================================
// 1. Simple Signal
// ============================================================================

console.log('1. Simple Signal:');

const count = signal(0);

console.log('Initial value:', count()); // 0

count.set(5);
console.log('After set(5):', count()); // 5

count.update((v) => v + 10);
console.log('After update(+10):', count()); // 15

count.reset();
console.log('After reset():', count()); // 0
console.log();

// ============================================================================
// 2. Computed Values
// ============================================================================

console.log('2. Computed Values:');

const num = signal(5);
const doubled = computed(() => num() * 2);
const quadrupled = computed(() => doubled() * 2);

console.log('num:', num()); // 5
console.log('doubled:', doubled()); // 10
console.log('quadrupled:', quadrupled()); // 20

num.set(10);
console.log('After num.set(10):');
console.log('num:', num()); // 10
console.log('doubled:', doubled()); // 20
console.log('quadrupled:', quadrupled()); // 40
console.log();

// ============================================================================
// 3. Effects (Side Effects)
// ============================================================================

console.log('3. Effects:');

const value = signal(0);
const log = [];

const stop = effect(() => {
  log.push(`Value changed to: ${value()}`);
});

console.log('After effect created:', log);
// ["Value changed to: 0"]

value.set(1);
value.set(2);
value.set(3);

console.log('After value updates:', log);
// ["Value changed to: 0", "Value changed to: 1", "Value changed to: 2", "Value changed to: 3"]

stop(); // Stop effect
value.set(4); // Won't trigger effect

console.log('After stop():', log);
// Still ["Value changed to: 0", "Value changed to: 1", "Value changed to: 2", "Value changed to: 3"]
console.log();

// ============================================================================
// 4. Watch (Targeted Watching)
// ============================================================================

console.log('4. Watch:');

const name = signal('John');
const changes = [];

watch(name, (newVal, oldVal) => {
  changes.push({ from: oldVal, to: newVal });
});

name.set('Jane');
name.set('Bob');

console.log('Name changes:', changes);
// [{ from: undefined, to: "Jane" }, { from: "Jane", to: "Bob" }]
console.log();

// ============================================================================
// 5. Batching Updates
// ============================================================================

console.log('5. Batching:');

const a = signal(0);
const b = signal(0);
let effectCount = 0;

effect(() => {
  a();
  b();
  effectCount++;
});

console.log('Initial effect count:', effectCount); // 1

// Without batching - would trigger effect twice
a.set(1);
b.set(2);
console.log('After individual updates:', effectCount); // 3 (initial + 2 updates)

effectCount = 0;
effect(() => {
  a();
  b();
  effectCount++;
});

// With batching - triggers effect once
batch(() => {
  a.set(3);
  b.set(4);
});

console.log('After batched updates:', effectCount); // 2 (initial + 1 batched)
console.log();

// ============================================================================
// 6. Signal Utilities
// ============================================================================

console.log('6. Signal Utilities:');

// Toggle
const [isOpen, toggle, setOpen] = createToggle(false);
console.log('Toggle initial:', isOpen()); // false
toggle();
console.log('After toggle():', isOpen()); // true
toggle();
console.log('After toggle():', isOpen()); // false
setOpen(true);
console.log('After setOpen(true):', isOpen()); // true

// Counter
const counter = createCounter(0, { min: 0, max: 10, step: 2 });
console.log('\nCounter initial:', counter.value()); // 0
counter.increment();
console.log('After increment():', counter.value()); // 2
counter.increment(3); // +6 total
console.log('After increment(3):', counter.value()); // 8
counter.increment(10); // Would be 18, clamped to 10
console.log('After increment(10):', counter.value()); // 10
counter.decrement();
console.log('After decrement():', counter.value()); // 8
counter.reset();
console.log('After reset():', counter.value()); // 0
console.log();

// ============================================================================
// 7. Subscriptions
// ============================================================================

console.log('7. Subscriptions:');

const temperature = signal(20);
const tempLog = [];

const unsubscribe = temperature.subscribe((temp) => {
  tempLog.push(`Temperature: ${temp}°C`);
});

temperature.set(22);
temperature.set(25);
temperature.set(18);

console.log('Temperature log:', tempLog);
// ["Temperature: 22°C", "Temperature: 25°C", "Temperature: 18°C"]

unsubscribe();
temperature.set(30); // Won't be logged

console.log('After unsubscribe:', tempLog.length); // Still 3
console.log();

// ============================================================================
// Summary
// ============================================================================

console.log('=== Summary ===');
console.log('✓ Signals provide reactive state management');
console.log('✓ Computed values auto-update when dependencies change');
console.log('✓ Effects run side effects when dependencies change');
console.log('✓ Watch provides targeted dependency tracking');
console.log('✓ Batching optimizes multiple updates');
console.log('✓ Signal utilities simplify common patterns');
console.log('✓ Subscriptions enable direct observation');
