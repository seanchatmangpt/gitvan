/**
 * Response Helpers
 * Standard response formatting for all plugins
 */

export function successResponse(data, statusCode = 200) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

export function errorResponse(message, code, statusCode = 500) {
  return {
    success: false,
    error: {
      message,
      code,
      timestamp: new Date().toISOString()
    }
  };
}

export function listResponse(items, count, metadata = {}) {
  return {
    success: true,
    items,
    count,
    metadata,
    timestamp: new Date().toISOString()
  };
}

export function wsEvent(type, data) {
  return {
    type,
    data,
    timestamp: new Date().toISOString()
  };
}
