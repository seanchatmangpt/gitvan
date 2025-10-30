/**
 * Workflow Subsystem Instrumentation
 * Instruments GitVan workflows with OpenTelemetry spans and metrics
 */

import { SpanStatusCode, context, trace } from '@opentelemetry/api';
import { getTelemetry } from '../index.mjs';

/**
 * Instrument a workflow execution
 */
export function instrumentWorkflow(workflowName, workflowFn) {
  return async function instrumentedWorkflow(...args) {
    const telemetry = getTelemetry();

    if (!telemetry.initialized) {
      return await workflowFn(...args);
    }

    const startTime = Date.now();
    const span = telemetry.startSpan(`workflow.${workflowName}`, {
      'workflow.name': workflowName,
      'workflow.type': 'execution',
      'workflow.args': JSON.stringify(args).substring(0, 500),
    });

    try {
      const result = await workflowFn(...args);

      const duration = Date.now() - startTime;

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('workflow.success', true);
      span.setAttribute('workflow.duration', duration);
      span.setAttribute('workflow.steps', result?.steps?.length || 0);
      span.setAttribute('workflow.result', JSON.stringify(result).substring(0, 500));

      telemetry.recordWorkflow(workflowName, duration, true, {
        'steps.count': result?.steps?.length || 0,
        'steps.success': result?.success ? 'true' : 'false',
      });

      span.end();

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.setAttribute('workflow.success', false);
      span.setAttribute('workflow.error', error.message);
      span.setAttribute('workflow.duration', duration);

      telemetry.recordWorkflow(workflowName, duration, false, {
        'error.type': error.constructor.name,
        'error.message': error.message,
      });

      span.end();

      throw error;
    }
  };
}

/**
 * Instrument workflow step execution
 */
export function instrumentWorkflowStep(stepName, stepFn, workflowContext) {
  return async function instrumentedStep(...args) {
    const telemetry = getTelemetry();

    if (!telemetry.initialized) {
      return await stepFn(...args);
    }

    const startTime = Date.now();
    const span = telemetry.startSpan(`workflow.step.${stepName}`, {
      'workflow.step.name': stepName,
      'workflow.step.type': workflowContext?.type || 'unknown',
      'workflow.name': workflowContext?.workflowName || 'unknown',
    });

    try {
      const result = await stepFn(...args);

      const duration = Date.now() - startTime;

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('workflow.step.success', true);
      span.setAttribute('workflow.step.duration', duration);
      span.end();

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.setAttribute('workflow.step.success', false);
      span.setAttribute('workflow.step.error', error.message);
      span.setAttribute('workflow.step.duration', duration);
      span.end();

      throw error;
    }
  };
}

/**
 * Instrument workflow list operation
 */
export function instrumentWorkflowList(listFn) {
  return instrumentWorkflow('workflow.list', listFn);
}

/**
 * Instrument workflow run operation
 */
export function instrumentWorkflowRun(runFn) {
  return instrumentWorkflow('workflow.run', runFn);
}

/**
 * Instrument workflow validate operation
 */
export function instrumentWorkflowValidate(validateFn) {
  return instrumentWorkflow('workflow.validate', validateFn);
}

/**
 * Instrument workflow history operation
 */
export function instrumentWorkflowHistory(historyFn) {
  return instrumentWorkflow('workflow.history', historyFn);
}

/**
 * Wrap workflow executor with instrumentation
 */
export function instrumentWorkflowExecutor(executorClass) {
  return class InstrumentedWorkflowExecutor extends executorClass {
    async execute(workflowId, params) {
      const telemetry = getTelemetry();

      if (!telemetry.initialized) {
        return await super.execute(workflowId, params);
      }

      const startTime = Date.now();
      const span = telemetry.startSpan('workflow.executor.execute', {
        'workflow.id': workflowId,
        'workflow.params': JSON.stringify(params).substring(0, 500),
      });

      try {
        const result = await super.execute(workflowId, params);

        const duration = Date.now() - startTime;

        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttribute('workflow.success', result.success);
        span.setAttribute('workflow.duration', duration);
        span.setAttribute('workflow.steps.total', result.steps?.length || 0);
        span.end();

        telemetry.recordWorkflow(workflowId, duration, result.success, {
          'steps.total': result.steps?.length || 0,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
        span.end();

        telemetry.recordWorkflow(workflowId, duration, false, {
          'error.type': error.constructor.name,
        });

        throw error;
      }
    }
  };
}

export default {
  instrumentWorkflow,
  instrumentWorkflowStep,
  instrumentWorkflowList,
  instrumentWorkflowRun,
  instrumentWorkflowValidate,
  instrumentWorkflowHistory,
  instrumentWorkflowExecutor,
};
