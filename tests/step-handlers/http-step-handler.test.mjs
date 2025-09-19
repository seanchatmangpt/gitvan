/**
 * HttpStepHandler Individual Test
 * Tests the HTTP step handler in isolation to ensure it properly handles HTTP requests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpStepHandler } from "../../src/workflow/step-handlers/http-step-handler.mjs";

// Mock fetch globally
global.fetch = vi.fn();

describe("HttpStepHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should make GET request and return response", async () => {
    // Mock successful response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({ message: "Hello, World!" }),
      text: vi.fn().mockResolvedValue('{"message":"Hello, World!"}'),
    };

    global.fetch.mockResolvedValue(mockResponse);

    // Create handler
    const handler = new HttpStepHandler();

    // Define step
    const step = {
      id: "test-get",
      type: "http",
      config: {
        method: "GET",
        url: "https://api.example.com/test",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        },
      },
    };

    // Execute step
    const result = await handler.execute(step, {}, {});

    // Verify results
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.method).toBe("GET");
    expect(result.data.url).toBe("https://api.example.com/test");
    expect(result.data.status).toBe(200);
    expect(result.data.statusText).toBe("OK");
    expect(result.data.responseData).toEqual({ message: "Hello, World!" });

    // Verify fetch was called correctly
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/test",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        }),
      })
    );
  });

  it("should make POST request with JSON body", async () => {
    // Mock successful response
    const mockResponse = {
      ok: true,
      status: 201,
      statusText: "Created",
      headers: new Map([["content-type", "application/json"]]),
      json: vi
        .fn()
        .mockResolvedValue({ id: 123, message: "Created successfully" }),
      text: vi
        .fn()
        .mockResolvedValue('{"id":123,"message":"Created successfully"}'),
    };

    global.fetch.mockResolvedValue(mockResponse);

    // Create handler
    const handler = new HttpStepHandler();

    // Define step
    const step = {
      id: "test-post",
      type: "http",
      config: {
        method: "POST",
        url: "https://api.example.com/users",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          name: "John Doe",
          email: "john@example.com",
        },
      },
    };

    // Execute step
    const result = await handler.execute(step, {}, {});

    // Verify results
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.method).toBe("POST");
    expect(result.data.url).toBe("https://api.example.com/users");
    expect(result.data.status).toBe(201);
    expect(result.data.responseData).toEqual({
      id: 123,
      message: "Created successfully",
    });

    // Verify fetch was called with correct body
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/users",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "John Doe",
          email: "john@example.com",
        }),
      })
    );
  });

  it("should handle variable replacement in URL and headers", async () => {
    // Mock successful response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({ success: true }),
      text: vi.fn().mockResolvedValue('{"success":true}'),
    };

    global.fetch.mockResolvedValue(mockResponse);

    // Create handler
    const handler = new HttpStepHandler();

    // Define step with variables
    const step = {
      id: "test-variables",
      type: "http",
      config: {
        method: "GET",
        url: "https://api.{{ domain }}/users/{{ userId }}",
        headers: {
          Authorization: "Bearer {{ token }}",
          "X-API-Version": "{{ version }}",
        },
      },
    };

    // Define inputs
    const inputs = {
      domain: "example.com",
      userId: "123",
      token: "abc123",
      version: "v2",
    };

    // Execute step
    const result = await handler.execute(step, inputs, {});

    // Verify results
    expect(result.success).toBe(true);
    expect(result.data.url).toBe("https://api.example.com/users/123");

    // Verify fetch was called with replaced variables
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/users/123",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer abc123",
          "X-API-Version": "v2",
        }),
      })
    );
  });

  it("should handle HTTP error responses", async () => {
    // Mock error response
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Map([["content-type", "application/json"]]),
      json: vi.fn().mockResolvedValue({ error: "Resource not found" }),
      text: vi.fn().mockResolvedValue('{"error":"Resource not found"}'),
    };

    global.fetch.mockResolvedValue(mockResponse);

    // Create handler
    const handler = new HttpStepHandler();

    // Define step
    const step = {
      id: "test-error",
      type: "http",
      config: {
        method: "GET",
        url: "https://api.example.com/nonexistent",
      },
    };

    // Execute step
    const result = await handler.execute(step, {}, {});

    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("HTTP 404: Not Found");
    expect(result.data).toBeDefined();
    expect(result.data.status).toBe(404);
    expect(result.data.statusText).toBe("Not Found");
  });

  it("should handle network errors", async () => {
    // Mock network error
    global.fetch.mockRejectedValue(new Error("Network error"));

    // Create handler
    const handler = new HttpStepHandler();

    // Define step
    const step = {
      id: "test-network-error",
      type: "http",
      config: {
        method: "GET",
        url: "https://api.example.com/test",
      },
    };

    // Execute step
    const result = await handler.execute(step, {}, {});

    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("HTTP request failed");
  });

  it("should handle timeout", async () => {
    // Mock timeout
    global.fetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, status: 200 }), 100)
        )
    );

    // Create handler with short timeout
    const handler = new HttpStepHandler({ defaultTimeout: 50 });

    // Define step
    const step = {
      id: "test-timeout",
      type: "http",
      config: {
        method: "GET",
        url: "https://api.example.com/slow",
      },
    };

    // Execute step
    const result = await handler.execute(step, {}, {});

    // Verify timeout handling
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("HTTP request failed");
  });

  it("should handle different response types", async () => {
    // Mock text response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "text/plain"]]),
      json: vi.fn().mockRejectedValue(new Error("Not JSON")),
      text: vi.fn().mockResolvedValue("Plain text response"),
    };

    global.fetch.mockResolvedValue(mockResponse);

    // Create handler
    const handler = new HttpStepHandler();

    // Define step
    const step = {
      id: "test-text-response",
      type: "http",
      config: {
        method: "GET",
        url: "https://api.example.com/text",
      },
    };

    // Execute step
    const result = await handler.execute(step, {}, {});

    // Verify results
    expect(result.success).toBe(true);
    expect(result.data.responseData).toBe("Plain text response");
  });

  it("should handle custom timeout in step config", async () => {
    // Mock timeout
    global.fetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, status: 200 }), 100)
        )
    );

    // Create handler
    const handler = new HttpStepHandler();

    // Define step with custom timeout
    const step = {
      id: "test-custom-timeout",
      type: "http",
      config: {
        method: "GET",
        url: "https://api.example.com/slow",
        timeout: 50,
      },
    };

    // Execute step
    const result = await handler.execute(step, {}, {});

    // Verify timeout handling
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("HTTP request failed");
  });

  it("should handle missing URL", async () => {
    // Create handler
    const handler = new HttpStepHandler();

    // Define step without URL
    const step = {
      id: "test-no-url",
      type: "http",
      config: {
        method: "GET",
      },
    };

    // Execute step
    const result = await handler.execute(step, {}, {});

    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("HTTP step missing URL");
  });

  it("should handle missing method", async () => {
    // Create handler
    const handler = new HttpStepHandler();

    // Define step without method
    const step = {
      id: "test-no-method",
      type: "http",
      config: {
        url: "https://api.example.com/test",
      },
    };

    // Execute step
    const result = await handler.execute(step, {}, {});

    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("HTTP step missing method");
  });
});
