// src/workflow/step-handlers/http-step-handler.mjs
// HTTP request step handler with proper variable replacement and response handling

import { BaseStepHandler } from "./base-step-handler.mjs";
import { useLog } from "../../composables/log.mjs";
import { useTemplate } from "../../composables/template.mjs";

/**
 * Handler for HTTP request steps
 */
export class HttpStepHandler extends BaseStepHandler {
  getStepType() {
    return "http";
  }

  validate(step) {
    if (!step.config) {
      throw new Error("HTTP step missing configuration");
    }

    if (!step.config.url) {
      throw new Error("HTTP step missing URL");
    }

    if (!step.config.method) {
      throw new Error("HTTP step missing method");
    }

    return true;
  }

  /**
   * Execute HTTP request step
   * @param {object} step - Step definition
   * @param {object} inputs - Step inputs
   * @param {object} context - Execution context
   * @returns {Promise<object>} Step execution result
   */
  async execute(step, inputs, context) {
    try {
      // Validate step configuration
      this.validate(step);

      const {
        url,
        method = "GET",
        headers = {},
        body,
        timeout = 30000, // Default 30 second timeout
      } = step.config;

      this.logger.info(`🌐 Executing HTTP request: ${method} ${url}`);
      // Use useTemplate for proper variable replacement
      const template = await useTemplate();

      // Replace variables in URL, headers, and body
      const processedUrl = template.renderString(url, inputs);
      const processedHeaders = this._processHeaders(headers, inputs, template);
      const processedBody = body
        ? this._processBody(body, inputs, template)
        : undefined;

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions = {
        method,
        headers: processedHeaders,
        signal: controller.signal,
      };

      if (processedBody) {
        fetchOptions.body = processedBody;
      }

      const response = await fetch(processedUrl, fetchOptions);
      clearTimeout(timeoutId);

      // Process response data
      const responseData = await this._processResponse(response);

      // Check if response is successful
      if (!response.ok) {
        return this.createResult(
          {
            url: processedUrl,
            method,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            responseData: responseData,
            success: false,
            timestamp: new Date().toISOString(),
          },
          false,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return this.createResult({
        url: processedUrl,
        method,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        responseData: responseData, // Use responseData to match test expectations
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`❌ HTTP request failed: ${error.message}`);
      return this.createResult(
        null,
        false,
        `HTTP request failed: ${error.message}`
      );
    }
  }

  /**
   * Process headers with variable replacement
   * @param {object} headers - Headers object
   * @param {object} inputs - Input variables
   * @param {object} template - Template engine
   * @returns {object} Processed headers
   */
  _processHeaders(headers, inputs, template) {
    const processedHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === "string") {
        processedHeaders[key] = template.renderString(value, inputs);
      } else {
        processedHeaders[key] = value;
      }
    }
    return processedHeaders;
  }

  /**
   * Process body with variable replacement
   * @param {string|object} body - Request body
   * @param {object} inputs - Input variables
   * @param {object} template - Template engine
   * @returns {string} Processed body
   */
  _processBody(body, inputs, template) {
    if (typeof body === "string") {
      return template.renderString(body, inputs);
    } else if (typeof body === "object") {
      // For objects, render as JSON string with variable replacement
      const jsonString = JSON.stringify(body);
      return template.renderString(jsonString, inputs);
    }
    return body;
  }

  /**
   * Process response data based on content type
   * @param {Response} response - Fetch response object
   * @returns {Promise<any>} Processed response data
   */
  async _processResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch (error) {
        // Fallback to text if JSON parsing fails
        return await response.text();
      }
    } else {
      return await response.text();
    }
  }
}
