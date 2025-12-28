/**
 * @fileoverview GitVan v4 - Event Handling Hooks Module Index
 *
 * Exports all event handling hooks and types.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

// Export all types
export * from './types.js';

// Export all hooks
export {
  useEventBus,
  useEvent,
  useEvents,
  useEmit,
  useWaitForEvent,
  useEventHistory,
  useEventCount,
  useDebouncedEvent,
  useThrottledEvent,
  useEventChannel,
  resetEventBus,
} from './hooks.js';
