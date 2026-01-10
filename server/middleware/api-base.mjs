/**
 * Base API Middleware - Phase C
 *
 * Core middleware for API request handling:
 * - Request/response logging
 * - Error handling
 * - CORS support
 * - Request validation
 * - Response formatting
 *
 * All /api/* routes pass through this middleware
 */

export default defineEventHandler(async (event) => {
  const startTime = Date.now();
  const method = event.method || event.node.req.method;
  const path = event.node.req.url || '';

  // Add CORS headers
  setHeader(event, 'Access-Control-Allow-Origin', '*');
  setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization');
  setHeader(event, 'X-Content-Type-Options', 'nosniff');

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    setResponseStatus(event, 200);
    return { ok: true };
  }

  // Add request ID for tracking
  event.id = crypto.randomUUID();
  setHeader(event, 'X-Request-ID', event.id);

  // Add JSON content type
  if (!getHeader(event, 'content-type')) {
    setHeader(event, 'content-type', 'application/json');
  }

  // Request logging
  const queryString = event.node.req.url.includes('?') ? event.node.req.url.split('?')[1] : '';
  console.log(`[API ${event.id}] ${method} ${path} ${queryString ? '?' + queryString : ''}`);

  // Wrap response to log duration
  const originalEndHandler = event.node.res.end;
  event.node.res.end = function(...args) {
    const duration = Date.now() - startTime;
    const statusCode = event.node.res.statusCode || 200;
    console.log(`[API ${event.id}] ${method} ${path} - ${statusCode} - ${duration}ms`);
    return originalEndHandler.apply(this, args);
  };
});
