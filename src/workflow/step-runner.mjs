// src/workflow/step-runner.mjs
// Step execution engine. Enterprise mode admits actuation before handler execution.

import { StepHandlerRegistry } from "./step-handlers/step-handler-registry.mjs";
import { createActuationBroker } from "../enterprise/actuation-broker.mjs";

export class StepRunner {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.enterprisePolicy = options.enterprisePolicy || {};
    this.handlerRegistry = new StepHandlerRegistry({ logger: this.logger });
  }

  async executeStep(step, contextManager, graph, turtle, options = {}) {
    const startTime = performance.now();
    let broker = null;
    let actuationStarted = false;

    if (options.verbose) {
      this.logger.info(`⚡ Executing step: ${step.id} (${step.type})`);
    }

    try {
      this.handlerRegistry.validateStep(step);
      const inputs = await this._getStepInputs(step, contextManager);

      broker = createActuationBroker(step, {
        ...this.enterprisePolicy,
        ...(options.enterprisePolicy || {}),
      });
      const admission = broker.admit();

      if (!admission.admitted) {
        const duration = performance.now() - startTime;
        this.logger.error(
          `⛔ Step refused: ${step.id} - ${admission.error.message}`
        );
        return {
          stepId: step.id,
          success: false,
          standing: "REFUSED",
          duration,
          error: admission.error.message,
          errorCode: admission.error.code,
          timestamp: new Date().toISOString(),
          stepType: step.type,
          handlerUsed: step.type,
          receipts: broker.receipts(),
        };
      }

      const admittedStep = admission.step;
      const context = {
        graph,
        turtle,
        contextManager,
        logger: this.logger,
        options,
        files: options.files,
        actuationBroker: broker,
        enterpriseEnvironment: admission.runtime?.environment,
        enterprisePolicy: broker.policy,
      };

      actuationStarted = true;
      const result = await this.handlerRegistry.executeStep(
        admittedStep,
        inputs,
        context
      );
      const success = result?.success !== false;

      await this._storeStepOutputs(admittedStep, result, contextManager);

      const duration = performance.now() - startTime;
      broker.complete({
        success,
        error: success ? null : result?.error,
        exitCode: result?.data?.exitCode ?? null,
        duration,
      });

      if (options.verbose) {
        const icon = success ? "✅" : "❌";
        this.logger.info(
          `${icon} Step ${success ? "completed" : "failed"}: ${admittedStep.id} (${duration.toFixed(2)}ms)`
        );
      }

      return {
        stepId: admittedStep.id,
        success,
        standing: success ? "EXECUTED" : "FAILED",
        duration,
        outputs: result?.data || {},
        ...(success
          ? {}
          : { error: result?.error || result?.data?.stderr || "Step handler reported failure" }),
        timestamp: new Date().toISOString(),
        stepType: admittedStep.type,
        handlerUsed: admittedStep.type,
        receipts: broker.receipts(),
      };
    } catch (error) {
      const duration = performance.now() - startTime;

      if (broker && actuationStarted) {
        try {
          broker.complete({
            success: false,
            error: error.message,
            exitCode: error.exitCode ?? null,
            duration,
          });
        } catch (receiptError) {
          this.logger.error(
            `❌ Failed to persist execution receipt for ${step.id}: ${receiptError.message}`
          );
        }
      }

      this.logger.error(`❌ Step failed: ${step.id} - ${error.message}`);

      return {
        stepId: step.id,
        success: false,
        standing: "FAILED",
        duration,
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
        stepType: step.type,
        handlerUsed: step.type,
        receipts: broker?.receipts?.() || [],
      };
    }
  }

  async _getStepInputs(step, contextManager) {
    if (!step.inputMapping) return {};

    const inputs = {};
    for (const [inputKey, contextKey] of Object.entries(step.inputMapping)) {
      try {
        inputs[inputKey] = await contextManager.get(contextKey);
      } catch (error) {
        this.logger.warn(
          `⚠️ Could not get input '${inputKey}' from context key '${contextKey}': ${error.message}`
        );
        inputs[inputKey] = null;
      }
    }
    return inputs;
  }

  async _storeStepOutputs(step, result, contextManager) {
    if (!step.outputMapping || !result?.success) return;

    for (const [contextKey, outputKey] of Object.entries(step.outputMapping)) {
      try {
        const value = outputKey ? result.data?.[outputKey] : result.data;
        await contextManager.set(contextKey, value);
      } catch (error) {
        this.logger.warn(
          `⚠️ Could not store output '${outputKey}' to context key '${contextKey}': ${error.message}`
        );
      }
    }
  }

  registerHandler(stepType, handler) {
    this.handlerRegistry.register(stepType, handler);
  }

  getRegisteredStepTypes() {
    return this.handlerRegistry.getRegisteredTypes();
  }

  isStepTypeSupported(stepType) {
    return this.handlerRegistry.hasHandler(stepType);
  }

  getHandlerRegistry() {
    return this.handlerRegistry;
  }
}
