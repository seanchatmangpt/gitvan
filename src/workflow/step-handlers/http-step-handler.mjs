// src/workflow/step-handlers/http-step-handler.mjs

import { BaseStepHandler } from "./base-step-handler.mjs";
import { useTemplate } from "../../composables/template.mjs";

export class HttpStepHandler extends BaseStepHandler {
  getStepType() {
    return "http";
  }

  validate(step) {
    if (!step.config) throw new Error("HTTP step missing configuration");
    if (!step.config.url) throw new Error("HTTP step missing URL");
    if (!step.config.method) throw new Error("HTTP step missing method");
    return true;
  }

  async execute(step, inputs, context) {
    let timeoutId = null;
    try {
      this.validate(step);
      const {
        url,
        method = "GET",
        headers = {},
        body,
        timeout = 30000,
      } = step.config;
      const enterprise =
        context.enterprisePolicy?.enabled === true ||
        process.env.GITVAN_ENTERPRISE_MODE === "1";

      if (enterprise && !context.actuationBroker) {
        throw new Error("Enterprise HTTP actuation requires an admitted actuation broker");
      }

      const template = await useTemplate();
      const processedUrl = template.renderString(url, inputs);
      const processedHeaders = this._processHeaders(headers, inputs, template);
      const processedBody = body
        ? this._processBody(body, inputs, template)
        : undefined;

      const safeLogUrl = enterprise
        ? new URL(processedUrl).origin
        : processedUrl;
      this.logger.info(`🌐 Executing HTTP request: ${method} ${safeLogUrl}`);

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions = {
        method,
        headers: processedHeaders,
        signal: controller.signal,
        // A redirect is a second destination and therefore a second actuation.
        // Enterprise mode refuses implicit redirects instead of escaping the
        // destination admitted by the broker.
        redirect: enterprise ? "manual" : "follow",
      };
      if (processedBody) fetchOptions.body = processedBody;

      const response = await fetch(processedUrl, fetchOptions);
      const responseData = await this._processResponse(response);

      if (!response.ok) {
        return this.createResult(
          {
            url: enterprise ? safeLogUrl : processedUrl,
            method,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            responseData,
            success: false,
            timestamp: new Date().toISOString(),
          },
          false,
          response.status >= 300 && response.status < 400 && enterprise
            ? "Enterprise HTTP redirects require explicit re-admission"
            : `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return this.createResult({
        url: enterprise ? safeLogUrl : processedUrl,
        method,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        responseData,
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
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  _processHeaders(headers, inputs, template) {
    const processedHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
      processedHeaders[key] = typeof value === "string"
        ? template.renderString(value, inputs)
        : value;
    }
    return processedHeaders;
  }

  _processBody(body, inputs, template) {
    if (typeof body === "string") return template.renderString(body, inputs);
    if (typeof body === "object") {
      return template.renderString(JSON.stringify(body), inputs);
    }
    return body;
  }

  async _processResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch {
        return await response.text();
      }
    }
    return await response.text();
  }
}
