/**
 * Git Operations Instrumentation
 * Instruments Git Native I/O operations with OpenTelemetry
 */

import { SpanStatusCode } from '@opentelemetry/api';
import { getTelemetry } from '../index.mjs';

/**
 * Instrument a Git operation
 */
export function instrumentGitOperation(operationName, operationFn) {
  return async function instrumentedGitOperation(...args) {
    const telemetry = getTelemetry();

    if (!telemetry.initialized) {
      return await operationFn(...args);
    }

    const startTime = Date.now();
    const span = telemetry.startSpan(`git.${operationName}`, {
      'git.operation': operationName,
      'git.cwd': process.cwd(),
      'git.args': JSON.stringify(args).substring(0, 500),
    });

    try {
      const result = await operationFn(...args);

      const duration = Date.now() - startTime;

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('git.success', true);
      span.setAttribute('git.duration', duration);

      telemetry.recordGitOperation(operationName, duration, true);

      span.end();

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.setAttribute('git.success', false);
      span.setAttribute('git.error', error.message);
      span.setAttribute('git.duration', duration);

      telemetry.recordGitOperation(operationName, duration, false, {
        'error.type': error.constructor.name,
        'error.message': error.message,
      });

      span.end();

      throw error;
    }
  };
}

/**
 * Instrument Git commit operation
 */
export function instrumentGitCommit(commitFn) {
  return instrumentGitOperation('commit', commitFn);
}

/**
 * Instrument Git push operation
 */
export function instrumentGitPush(pushFn) {
  return instrumentGitOperation('push', pushFn);
}

/**
 * Instrument Git pull operation
 */
export function instrumentGitPull(pullFn) {
  return instrumentGitOperation('pull', pullFn);
}

/**
 * Instrument Git status operation
 */
export function instrumentGitStatus(statusFn) {
  return instrumentGitOperation('status', statusFn);
}

/**
 * Instrument Git add operation
 */
export function instrumentGitAdd(addFn) {
  return instrumentGitOperation('add', addFn);
}

/**
 * Instrument Git log operation
 */
export function instrumentGitLog(logFn) {
  return instrumentGitOperation('log', logFn);
}

/**
 * Wrap GitNativeIO class with instrumentation
 */
export function instrumentGitNativeIO(gitIOClass) {
  return class InstrumentedGitNativeIO extends gitIOClass {
    async commit(...args) {
      return await instrumentGitCommit(super.commit.bind(this))(...args);
    }

    async push(...args) {
      return await instrumentGitPush(super.push.bind(this))(...args);
    }

    async pull(...args) {
      return await instrumentGitPull(super.pull.bind(this))(...args);
    }

    async status(...args) {
      return await instrumentGitStatus(super.status.bind(this))(...args);
    }

    async add(...args) {
      return await instrumentGitAdd(super.add.bind(this))(...args);
    }

    async log(...args) {
      return await instrumentGitLog(super.log.bind(this))(...args);
    }
  };
}

export default {
  instrumentGitOperation,
  instrumentGitCommit,
  instrumentGitPush,
  instrumentGitPull,
  instrumentGitStatus,
  instrumentGitAdd,
  instrumentGitLog,
  instrumentGitNativeIO,
};
