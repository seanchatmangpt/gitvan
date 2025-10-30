/**
 * Hooks Subsystem Instrumentation
 * Instruments GitVan hooks with OpenTelemetry spans and metrics
 */

import { SpanStatusCode } from '@opentelemetry/api';
import { getTelemetry } from '../index.mjs';

/**
 * Instrument a hook execution
 */
export function instrumentHook(hookName, hookFn) {
  return async function instrumentedHook(...args) {
    const telemetry = getTelemetry();

    if (!telemetry.initialized) {
      return await hookFn(...args);
    }

    const startTime = Date.now();
    const span = telemetry.startSpan(`hook.${hookName}`, {
      'hook.name': hookName,
      'hook.type': typeof hookFn,
      'hook.args': JSON.stringify(args).substring(0, 500), // Limit size
    });

    try {
      const result = await hookFn(...args);

      const duration = Date.now() - startTime;

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('hook.success', true);
      span.setAttribute('hook.duration', duration);
      span.setAttribute('hook.result', JSON.stringify(result).substring(0, 500));

      telemetry.recordHook(hookName, duration, true);

      span.end();

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.setAttribute('hook.success', false);
      span.setAttribute('hook.error', error.message);
      span.setAttribute('hook.duration', duration);

      telemetry.recordHook(hookName, duration, false, {
        'error.type': error.constructor.name,
        'error.message': error.message,
      });

      span.end();

      throw error;
    }
  };
}

/**
 * Instrument hooks evaluate operation
 */
export function instrumentHooksEvaluate(evaluateFn) {
  return instrumentHook('hooks.evaluate', evaluateFn);
}

/**
 * Instrument hooks list operation
 */
export function instrumentHooksList(listFn) {
  return instrumentHook('hooks.list', listFn);
}

/**
 * Instrument pre-task hook
 */
export function instrumentPreTaskHook(preTaskFn) {
  return instrumentHook('hooks.pre-task', preTaskFn);
}

/**
 * Instrument post-task hook
 */
export function instrumentPostTaskHook(postTaskFn) {
  return instrumentHook('hooks.post-task', postTaskFn);
}

/**
 * Instrument post-edit hook
 */
export function instrumentPostEditHook(postEditFn) {
  return instrumentHook('hooks.post-edit', postEditFn);
}

/**
 * Instrument session hooks
 */
export function instrumentSessionHooks(sessionFns) {
  return {
    restore: sessionFns.restore ? instrumentHook('hooks.session-restore', sessionFns.restore) : undefined,
    end: sessionFns.end ? instrumentHook('hooks.session-end', sessionFns.end) : undefined,
    ...sessionFns
  };
}

export default {
  instrumentHook,
  instrumentHooksEvaluate,
  instrumentHooksList,
  instrumentPreTaskHook,
  instrumentPostTaskHook,
  instrumentPostEditHook,
  instrumentSessionHooks,
};
