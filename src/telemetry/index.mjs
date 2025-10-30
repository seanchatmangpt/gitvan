/**
 * OpenTelemetry Instrumentation for GitVan
 * Provides distributed tracing, metrics, and observability
 */

import { trace, metrics, context, propagation } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';

class GitVanTelemetry {
  constructor(config = {}) {
    this.config = {
      serviceName: 'gitvan',
      serviceVersion: '2.1.0',
      environment: process.env.NODE_ENV || 'development',
      exportToConsole: config.exportToConsole !== false,
      exportToOTLP: config.exportToOTLP || false,
      otlpEndpoint: config.otlpEndpoint || 'http://localhost:4318',
      enableAutoInstrumentation: config.enableAutoInstrumentation !== false,
      exportToFile: config.exportToFile !== false,
      exportDir: config.exportDir || './.telemetry',
      ...config
    };

    this.sdk = null;
    this.tracer = null;
    this.meter = null;
    this.spans = [];
    this.metrics = [];
    this.initialized = false;
  }

  /**
   * Initialize OpenTelemetry SDK
   */
  async initialize() {
    if (this.initialized) return;

    const resource = resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: this.config.serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: this.config.serviceVersion,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: this.config.environment,
    });

    const traceExporter = new OTLPTraceExporter({
      url: `${this.config.otlpEndpoint}/v1/traces`,
    });

    const metricExporter = new OTLPMetricExporter({
      url: `${this.config.otlpEndpoint}/v1/metrics`,
    });

    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 1000,
    });

    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader,
      instrumentations: this.config.enableAutoInstrumentation
        ? [getNodeAutoInstrumentations()]
        : [],
    });

    await this.sdk.start();

    this.tracer = trace.getTracer(
      this.config.serviceName,
      this.config.serviceVersion
    );

    this.meter = metrics.getMeter(
      this.config.serviceName,
      this.config.serviceVersion
    );

    this.initialized = true;

    // Create metrics
    this._initializeMetrics();

    return this;
  }

  /**
   * Initialize core metrics
   */
  _initializeMetrics() {
    this.commandCounter = this.meter.createCounter('gitvan.commands', {
      description: 'Number of CLI commands executed',
      unit: '1'
    });

    this.commandDuration = this.meter.createHistogram('gitvan.command.duration', {
      description: 'Duration of CLI command execution',
      unit: 'ms'
    });

    this.hookCounter = this.meter.createCounter('gitvan.hooks', {
      description: 'Number of hooks executed',
      unit: '1'
    });

    this.workflowCounter = this.meter.createCounter('gitvan.workflows', {
      description: 'Number of workflows executed',
      unit: '1'
    });

    this.gitOperationCounter = this.meter.createCounter('gitvan.git.operations', {
      description: 'Number of Git operations',
      unit: '1'
    });

    this.errorCounter = this.meter.createCounter('gitvan.errors', {
      description: 'Number of errors',
      unit: '1'
    });
  }

  /**
   * Start a span for an operation
   */
  startSpan(name, attributes = {}, options = {}) {
    if (!this.initialized) {
      console.warn('Telemetry not initialized, span will not be recorded');
      return { end: () => {}, setAttribute: () => {}, setStatus: () => {} };
    }

    const span = this.tracer.startSpan(name, {
      attributes: {
        'gitvan.version': this.config.serviceVersion,
        ...attributes
      },
      ...options
    });

    // Track span for export
    if (this.config.exportToFile) {
      this.spans.push({
        name,
        startTime: Date.now(),
        attributes,
        spanContext: span.spanContext()
      });
    }

    return span;
  }

  /**
   * Record a command execution
   */
  recordCommand(commandName, duration, success = true, attributes = {}) {
    this.commandCounter.add(1, {
      command: commandName,
      success: success.toString(),
      ...attributes
    });

    this.commandDuration.record(duration, {
      command: commandName,
      success: success.toString(),
      ...attributes
    });

    if (!success) {
      this.errorCounter.add(1, {
        component: 'command',
        command: commandName,
        ...attributes
      });
    }
  }

  /**
   * Record a hook execution
   */
  recordHook(hookName, duration, success = true, attributes = {}) {
    this.hookCounter.add(1, {
      hook: hookName,
      success: success.toString(),
      ...attributes
    });

    if (!success) {
      this.errorCounter.add(1, {
        component: 'hook',
        hook: hookName,
        ...attributes
      });
    }
  }

  /**
   * Record a workflow execution
   */
  recordWorkflow(workflowName, duration, success = true, attributes = {}) {
    this.workflowCounter.add(1, {
      workflow: workflowName,
      success: success.toString(),
      ...attributes
    });

    if (!success) {
      this.errorCounter.add(1, {
        component: 'workflow',
        workflow: workflowName,
        ...attributes
      });
    }
  }

  /**
   * Record a Git operation
   */
  recordGitOperation(operation, duration, success = true, attributes = {}) {
    this.gitOperationCounter.add(1, {
      operation,
      success: success.toString(),
      ...attributes
    });

    if (!success) {
      this.errorCounter.add(1, {
        component: 'git',
        operation,
        ...attributes
      });
    }
  }

  /**
   * Export telemetry data to JSON
   */
  async exportToJSON(outputPath) {
    const fs = await import('fs/promises');
    const path = await import('path');

    const exportData = {
      metadata: {
        serviceName: this.config.serviceName,
        serviceVersion: this.config.serviceVersion,
        environment: this.config.environment,
        exportTime: new Date().toISOString(),
      },
      spans: this.spans,
      metrics: this.metrics,
      summary: {
        totalSpans: this.spans.length,
        totalMetrics: this.metrics.length,
      }
    };

    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));

    return exportData;
  }

  /**
   * Shutdown telemetry and flush data
   */
  async shutdown() {
    if (this.sdk) {
      await this.sdk.shutdown();
    }
    this.initialized = false;
  }
}

// Singleton instance
let telemetryInstance = null;

/**
 * Get or create telemetry instance
 */
export function getTelemetry(config = {}) {
  if (!telemetryInstance) {
    telemetryInstance = new GitVanTelemetry(config);
  }
  return telemetryInstance;
}

/**
 * Initialize telemetry
 */
export async function initializeTelemetry(config = {}) {
  const telemetry = getTelemetry(config);
  await telemetry.initialize();
  return telemetry;
}

export { GitVanTelemetry };
export default getTelemetry;
