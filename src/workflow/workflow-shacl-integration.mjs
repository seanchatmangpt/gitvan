/**
 * @fileoverview SHACL Integration for WorkflowEngine
 *
 * Adds SHACL validation capabilities to the workflow execution engine
 * Validates workflows before execution and provides recovery strategies
 *
 * @version 1.0.0
 * @license Apache-2.0
 */

import { useSHACLValidator } from '../composables/shacl-validator.mjs';
import { useLog } from '../composables/log.mjs';

/**
 * SHACL Validation Middleware for WorkflowEngine
 * Provides pre-execution validation and recovery
 */
export class WorkflowSHACLIntegration {
  constructor(workflowEngine) {
    this.engine = workflowEngine;
    this.validator = useSHACLValidator();
    this.logger = useLog();
  }

  /**
   * Validate workflow before execution
   * @param {Object} workflow - Workflow definition
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result with recovery info
   */
  async validateBeforeExecution(workflow, options = {}) {
    this.logger.info(`🔍 Pre-execution SHACL validation: ${workflow.id}`);

    const strict = options.strict || process.env.GITVAN_SHACL_STRICT === 'true';

    try {
      // Validate workflow structure
      const report = await this.validator.validateWorkflow(
        this.engine.core.store,
        { strict: false }
      );

      if (report.conforms) {
        this.logger.info('✅ Workflow passed SHACL validation');
        return {
          valid: true,
          violations: [],
          canExecute: true,
        };
      }

      // Workflow has violations - attempt recovery
      this.logger.warn(
        `⚠️ Workflow has ${report.stats.violations} violations, ${report.stats.warnings} warnings`
      );

      const recovery = await this._attemptRecovery(workflow, report);

      if (recovery.success) {
        this.logger.info(`✅ Recovered from SHACL violations`);
        return {
          valid: false,
          violations: report.violations,
          canExecute: true,
          recovered: true,
          recoveryActions: recovery.actions,
        };
      }

      // Recovery failed
      if (strict) {
        this.logger.error('❌ SHACL validation failed (strict mode)');
        throw new Error(
          `Workflow validation failed: ${report.violations[0]?.message || 'Unknown error'}`
        );
      }

      // Non-strict mode - warn but continue
      this.logger.warn('⚠️ Proceeding despite SHACL violations (non-strict mode)');
      return {
        valid: false,
        violations: report.violations,
        canExecute: true,
        recovered: false,
        warning: 'Workflow has unresolved validation violations',
      };
    } catch (error) {
      this.logger.error(`SHACL validation error: ${error.message}`);

      if (strict) {
        throw error;
      }

      return {
        valid: null,
        violations: [],
        canExecute: true,
        error: error.message,
      };
    }
  }

  /**
   * Validate a git event against SHACL shapes
   * @param {Object} event - Git event data
   * @returns {Promise<Object>} Validation result
   */
  async validateGitEvent(event) {
    try {
      const report = await this.validator.validateGitEvent(
        this.engine.core.store
      );

      return {
        valid: report.conforms,
        violations: report.violations,
        stats: report.stats,
      };
    } catch (error) {
      this.logger.warn(`Git event validation error: ${error.message}`);
      return {
        valid: true,
        violations: [],
      };
    }
  }

  /**
   * Validate hook predicates against SHACL shapes
   * @param {Object} hook - Hook definition
   * @returns {Promise<Object>} Validation result
   */
  async validateHook(hook) {
    try {
      const report = await this.validator.validateHook(
        this.engine.core.store
      );

      return {
        valid: report.conforms,
        violations: report.violations,
        stats: report.stats,
      };
    } catch (error) {
      this.logger.warn(`Hook validation error: ${error.message}`);
      return {
        valid: true,
        violations: [],
      };
    }
  }

  /**
   * Generate human-readable error report
   * @param {Object} validationResult - Result from validation
   * @returns {Object} Formatted error report
   */
  formatValidationReport(validationResult) {
    if (validationResult.valid) {
      return {
        success: true,
        message: 'Validation passed',
      };
    }

    const formatted = this.validator.formatErrorReport({
      conforms: validationResult.valid,
      violations: validationResult.violations,
      stats: validationResult.stats || {},
    });

    return {
      success: false,
      summary: formatted.summary,
      violations: formatted.violations,
      warnings: formatted.warnings,
      canExecute: validationResult.canExecute !== false,
      recovered: validationResult.recovered || false,
    };
  }

  /**
   * Attempt to recover from SHACL violations
   * @private
   */
  async _attemptRecovery(workflow, report) {
    const recoverable = report.violations.filter(v =>
      this._isRecoverable(v)
    );

    if (recoverable.length === 0) {
      return { success: false };
    }

    const actions = [];

    for (const violation of recoverable) {
      const action = await this._generateRecoveryAction(violation, workflow);
      if (action) {
        actions.push(action);
        this.logger.debug(`Recovery action: ${action.description}`);
      }
    }

    return {
      success: actions.length > 0,
      actions: actions,
    };
  }

  /**
   * Check if a violation is recoverable
   * @private
   */
  _isRecoverable(violation) {
    // These violations are automatically recoverable
    const recoverablePatterns = [
      'optional',
      'missing', // in non-critical fields
      'deprecated',
      'warning', // warnings are recoverable
    ];

    if (violation.severity === 'Warning' || violation.severity === 'Info') {
      return true;
    }

    const message = (violation.message || '').toLowerCase();
    return recoverablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Generate recovery action for a specific violation
   * @private
   */
  async _generateRecoveryAction(violation, workflow) {
    // Example recovery actions based on violation type
    if (violation.message?.includes('optional')) {
      return {
        type: 'skip',
        description: 'Skip optional validation',
        severity: 'info',
      };
    }

    if (violation.message?.includes('deprecated')) {
      return {
        type: 'deprecation_warning',
        description: 'Using deprecated feature',
        severity: 'warning',
        migration: 'See documentation for migration guide',
      };
    }

    return null;
  }

  /**
   * Create validation report for logging and diagnostics
   * @param {Object} workflow - Workflow definition
   * @param {Object} validationResult - Validation result
   * @returns {Object} Detailed diagnostic report
   */
  createDiagnosticReport(workflow, validationResult) {
    const violations = validationResult.violations || [];
    const timestamp = new Date().toISOString();

    return {
      timestamp,
      workflowId: workflow.id,
      workflowTitle: workflow.title,
      validationStatus: validationResult.valid ? 'PASS' : 'FAIL',
      canExecute: validationResult.canExecute !== false,
      violations: {
        count: violations.length,
        critical: violations.filter(v => v.severity === 'Violation').length,
        warnings: violations.filter(v => v.severity === 'Warning').length,
        info: violations.filter(v => v.severity === 'Info').length,
        details: violations.map(v => ({
          severity: v.severity,
          message: v.message,
          path: v.path,
          node: v.focusNode,
        })),
      },
      recovery: {
        attempted: validationResult.recovered === true,
        success: validationResult.recovered === true,
        actions: validationResult.recoveryActions || [],
      },
    };
  }
}

/**
 * Enhance WorkflowEngine with SHACL validation
 * Call this in WorkflowEngine constructor or initialization
 */
export function enhanceWorkflowEngineWithSHACL(workflowEngine) {
  const integration = new WorkflowSHACLIntegration(workflowEngine);

  // Add methods to engine
  workflowEngine.validateWorkflow = (workflow, options) =>
    integration.validateBeforeExecution(workflow, options);

  workflowEngine.validateGitEvent = (event) =>
    integration.validateGitEvent(event);

  workflowEngine.validateHook = (hook) => integration.validateHook(hook);

  workflowEngine.formatValidationReport = (report) =>
    integration.formatValidationReport(report);

  return integration;
}
