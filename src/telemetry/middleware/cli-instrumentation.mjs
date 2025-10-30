/**
 * CLI Command Instrumentation Middleware
 * Wraps CLI commands with OpenTelemetry spans and metrics
 */

import { SpanStatusCode } from '@opentelemetry/api';
import { getTelemetry } from '../index.mjs';

/**
 * Instrument a CLI command with telemetry
 */
export function instrumentCommand(commandName, commandFn) {
  return async function instrumentedCommand(...args) {
    const telemetry = getTelemetry();

    // Skip if not initialized (don't break commands)
    if (!telemetry.initialized) {
      return await commandFn(...args);
    }

    const startTime = Date.now();
    const span = telemetry.startSpan(`command.${commandName}`, {
      'command.name': commandName,
      'command.args': JSON.stringify(args),
      'command.cwd': process.cwd(),
    });

    try {
      const result = await commandFn(...args);

      const duration = Date.now() - startTime;

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('command.success', true);
      span.setAttribute('command.duration', duration);

      telemetry.recordCommand(commandName, duration, true, {
        'args.count': args.length,
      });

      span.end();

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.setAttribute('command.success', false);
      span.setAttribute('command.error', error.message);
      span.setAttribute('command.duration', duration);

      telemetry.recordCommand(commandName, duration, false, {
        'error.type': error.constructor.name,
        'error.message': error.message,
      });

      span.end();

      throw error;
    }
  };
}

/**
 * Create instrumented command map
 */
export function instrumentCommands(commands) {
  const instrumented = {};

  for (const [name, command] of Object.entries(commands)) {
    if (typeof command === 'function') {
      instrumented[name] = instrumentCommand(name, command);
    } else if (command && typeof command.run === 'function') {
      instrumented[name] = {
        ...command,
        run: instrumentCommand(name, command.run)
      };
    } else {
      instrumented[name] = command;
    }
  }

  return instrumented;
}

/**
 * Instrument subcommands recursively
 */
export function instrumentSubcommands(subcommands) {
  const instrumented = {};

  for (const [name, subcommand] of Object.entries(subcommands)) {
    if (typeof subcommand === 'function') {
      instrumented[name] = instrumentCommand(name, subcommand);
    } else if (subcommand && typeof subcommand === 'object') {
      instrumented[name] = {
        ...subcommand,
        subcommands: subcommand.subcommands
          ? instrumentSubcommands(subcommand.subcommands)
          : undefined,
        run: subcommand.run
          ? instrumentCommand(name, subcommand.run)
          : undefined,
      };
    } else {
      instrumented[name] = subcommand;
    }
  }

  return instrumented;
}

export default {
  instrumentCommand,
  instrumentCommands,
  instrumentSubcommands,
};
