/**
 * GitVan v4 Middleware Pipeline
 *
 * Hook-based middleware system for composable request/response handling.
 *
 * @packageDocumentation
 * @module @gitvan/v4/middleware/pipeline
 */

import type {
  Middleware,
  MiddlewareFn,
  MiddlewarePipeline,
  ApiRequest,
  ApiResponse,
  HttpMethod,
  HookPriority,
  Disposer,
} from '../types/index.js';
import { signal, computed, effect } from '../core/signals.js';
import { getCurrentContext, onCleanup } from '../core/context.js';

// =============================================================================
// Priority Ordering
// =============================================================================

const PRIORITY_ORDER: Record<HookPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  idle: 4,
};

// =============================================================================
// Middleware Pipeline Implementation
// =============================================================================

/**
 * Create a new middleware pipeline
 *
 * @example
 * ```ts
 * const pipeline = createPipeline();
 * pipeline.use(loggingMiddleware);
 * pipeline.use(authMiddleware);
 * pipeline.use(validationMiddleware);
 *
 * const response = await pipeline.execute(request, handler);
 * ```
 */
export function createPipeline<
  TReq extends ApiRequest = ApiRequest,
  TRes extends ApiResponse = ApiResponse
>(): MiddlewarePipeline<TReq, TRes> {
  const middlewares = signal<Middleware<TReq, TRes>[]>([]);

  // Sorted middleware (by priority and order)
  const sortedMiddleware = computed(() => {
    return [...middlewares()].sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.order - b.order;
    });
  });

  return {
    use(middleware: Middleware<TReq, TRes>): MiddlewarePipeline<TReq, TRes> {
      middlewares.update((list) => [...list, middleware]);
      return this;
    },

    remove(name: string): boolean {
      const current = middlewares.peek();
      const filtered = current.filter((m) => m.name !== name);
      if (filtered.length !== current.length) {
        middlewares.set(filtered);
        return true;
      }
      return false;
    },

    async execute(
      request: TReq,
      handler: () => Promise<TRes>
    ): Promise<TRes> {
      const applicable = sortedMiddleware().filter((m) => {
        if (!m.enabled) return false;

        // Check path patterns
        if (m.paths && m.paths.length > 0) {
          const matches = m.paths.some((pattern) =>
            matchPath(request.path, pattern)
          );
          if (!matches) return false;
        }

        // Check exclude patterns
        if (m.excludePaths && m.excludePaths.length > 0) {
          const excluded = m.excludePaths.some((pattern) =>
            matchPath(request.path, pattern)
          );
          if (excluded) return false;
        }

        // Check methods
        if (m.methods && m.methods.length > 0) {
          if (!m.methods.includes(request.method)) return false;
        }

        return true;
      });

      // Build middleware chain
      let index = 0;
      const next = async (): Promise<TRes> => {
        if (index < applicable.length) {
          const middleware = applicable[index++];
          return middleware.handler(request, next);
        }
        return handler();
      };

      return next();
    },

    getAll(): ReadonlyArray<Middleware<TReq, TRes>> {
      return sortedMiddleware();
    },

    clear(): void {
      middlewares.set([]);
    },
  };
}

// =============================================================================
// Path Matching
// =============================================================================

/**
 * Match a path against a glob pattern
 */
function matchPath(path: string, pattern: string): boolean {
  // Simple glob matching
  const regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{GLOBSTAR}}/g, '.*')
    .replace(/\//g, '\\/');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

// =============================================================================
// Middleware Factories
// =============================================================================

/**
 * Create a middleware descriptor
 *
 * @example
 * ```ts
 * const authMiddleware = defineMiddleware({
 *   name: 'auth',
 *   priority: 'high',
 *   handler: async (req, next) => {
 *     if (!req.headers.authorization) {
 *       return { status: 401, body: 'Unauthorized' };
 *     }
 *     return next();
 *   },
 * });
 * ```
 */
export function defineMiddleware<
  TReq extends ApiRequest = ApiRequest,
  TRes extends ApiResponse = ApiResponse
>(
  options: Omit<Middleware<TReq, TRes>, 'order'> & { order?: number }
): Middleware<TReq, TRes> {
  return {
    order: 0,
    ...options,
  };
}

/**
 * Create middleware from a simple function
 */
export function middleware<
  TReq extends ApiRequest = ApiRequest,
  TRes extends ApiResponse = ApiResponse
>(
  name: string,
  handler: MiddlewareFn<TReq, TRes>,
  options?: Partial<Omit<Middleware<TReq, TRes>, 'name' | 'handler'>>
): Middleware<TReq, TRes> {
  return {
    name,
    handler,
    priority: 'normal',
    order: 0,
    enabled: true,
    ...options,
  };
}

// =============================================================================
// Common Middleware
// =============================================================================

/**
 * Logging middleware
 */
export function loggingMiddleware(
  options?: {
    logRequest?: boolean;
    logResponse?: boolean;
    logger?: Console;
  }
): Middleware {
  const { logRequest = true, logResponse = true, logger = console } = options ?? {};

  return defineMiddleware({
    name: 'logging',
    priority: 'high',
    order: -100,
    enabled: true,
    handler: async (request, next) => {
      const start = Date.now();

      if (logRequest) {
        logger.log(`[${request.method}] ${request.path}`, {
          id: request.id,
          query: request.query,
        });
      }

      const response = await next();

      if (logResponse) {
        const duration = Date.now() - start;
        logger.log(`[${response.status}] ${request.path} (${duration}ms)`, {
          id: request.id,
        });
      }

      return response;
    },
  });
}

/**
 * Error handling middleware
 */
export function errorMiddleware(
  options?: {
    expose?: boolean;
    onError?: (error: Error, request: ApiRequest) => void;
  }
): Middleware {
  const { expose = false, onError } = options ?? {};

  return defineMiddleware({
    name: 'error-handler',
    priority: 'critical',
    order: -1000,
    enabled: true,
    handler: async (request, next) => {
      try {
        return await next();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err, request);

        return {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          body: expose
            ? { error: err.message, stack: err.stack }
            : { error: 'Internal Server Error' },
          meta: {
            requestId: request.id,
            timestamp: Date.now(),
            duration: 0,
          },
        } as ApiResponse;
      }
    },
  });
}

/**
 * CORS middleware
 */
export function corsMiddleware(
  options?: {
    origin?: string | string[] | ((origin: string) => boolean);
    methods?: HttpMethod[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
  }
): Middleware {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = false,
    maxAge = 86400,
  } = options ?? {};

  return defineMiddleware({
    name: 'cors',
    priority: 'high',
    order: -500,
    enabled: true,
    handler: async (request, next) => {
      const requestOrigin = request.headers['origin'] ?? '';

      // Check if origin is allowed
      let allowedOrigin = '*';
      if (typeof origin === 'string') {
        allowedOrigin = origin;
      } else if (Array.isArray(origin)) {
        if (origin.includes(requestOrigin)) {
          allowedOrigin = requestOrigin;
        }
      } else if (typeof origin === 'function') {
        if (origin(requestOrigin)) {
          allowedOrigin = requestOrigin;
        }
      }

      // Handle preflight
      if (request.method === 'OPTIONS') {
        return {
          status: 204,
          statusText: 'No Content',
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Methods': methods.join(', '),
            'Access-Control-Allow-Headers': headers.join(', '),
            'Access-Control-Allow-Credentials': String(credentials),
            'Access-Control-Max-Age': String(maxAge),
          },
          meta: {
            requestId: request.id,
            timestamp: Date.now(),
            duration: 0,
          },
        } as ApiResponse;
      }

      const response = await next();

      // Add CORS headers to response
      return {
        ...response,
        headers: {
          ...response.headers,
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Credentials': String(credentials),
        },
      };
    },
  });
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(
  options?: {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (request: ApiRequest) => string;
    onLimitReached?: (request: ApiRequest) => void;
  }
): Middleware {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = (req) => req.headers['x-forwarded-for'] ?? 'anonymous',
    onLimitReached,
  } = options ?? {};

  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  return defineMiddleware({
    name: 'rate-limit',
    priority: 'high',
    order: -400,
    enabled: true,
    handler: async (request, next) => {
      const key = keyGenerator(request);
      const now = Date.now();

      let entry = requestCounts.get(key);
      if (!entry || entry.resetAt < now) {
        entry = { count: 0, resetAt: now + windowMs };
        requestCounts.set(key, entry);
      }

      entry.count++;

      if (entry.count > maxRequests) {
        onLimitReached?.(request);

        return {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(entry.resetAt),
          },
          body: { error: 'Rate limit exceeded' },
          meta: {
            requestId: request.id,
            timestamp: Date.now(),
            duration: 0,
          },
        } as ApiResponse;
      }

      const response = await next();

      return {
        ...response,
        headers: {
          ...response.headers,
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': String(Math.max(0, maxRequests - entry.count)),
          'X-RateLimit-Reset': String(entry.resetAt),
        },
      };
    },
  });
}

/**
 * Timeout middleware
 */
export function timeoutMiddleware(
  options?: { timeoutMs?: number }
): Middleware {
  const { timeoutMs = 30000 } = options ?? {};

  return defineMiddleware({
    name: 'timeout',
    priority: 'critical',
    order: -900,
    enabled: true,
    handler: async (request, next) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // Attach abort signal to request
        const requestWithSignal = {
          ...request,
          signal: controller.signal,
        };

        return await next();
      } catch (error) {
        if (controller.signal.aborted) {
          return {
            status: 408,
            statusText: 'Request Timeout',
            headers: {},
            body: { error: 'Request timed out' },
            meta: {
              requestId: request.id,
              timestamp: Date.now(),
              duration: timeoutMs,
            },
          } as ApiResponse;
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    },
  });
}

/**
 * Caching middleware
 */
export function cacheMiddleware(
  options?: {
    ttlMs?: number;
    methods?: HttpMethod[];
    keyGenerator?: (request: ApiRequest) => string;
    shouldCache?: (response: ApiResponse) => boolean;
  }
): Middleware {
  const {
    ttlMs = 60000,
    methods = ['GET'],
    keyGenerator = (req) => `${req.method}:${req.path}:${JSON.stringify(req.query)}`,
    shouldCache = (res) => res.status >= 200 && res.status < 300,
  } = options ?? {};

  const cache = new Map<string, { response: ApiResponse; expiresAt: number }>();

  return defineMiddleware({
    name: 'cache',
    priority: 'normal',
    order: -200,
    enabled: true,
    methods,
    handler: async (request, next) => {
      const key = keyGenerator(request);
      const now = Date.now();

      // Check cache
      const cached = cache.get(key);
      if (cached && cached.expiresAt > now) {
        return {
          ...cached.response,
          meta: {
            ...cached.response.meta,
            cached: true,
          },
        };
      }

      const response = await next();

      // Store in cache if appropriate
      if (shouldCache(response)) {
        cache.set(key, {
          response,
          expiresAt: now + ttlMs,
        });
      }

      return response;
    },
  });
}

// =============================================================================
// Middleware Composition
// =============================================================================

/**
 * Compose multiple middleware into one
 *
 * @example
 * ```ts
 * const combined = composeMiddleware(
 *   loggingMiddleware(),
 *   authMiddleware(),
 *   validationMiddleware()
 * );
 * ```
 */
export function composeMiddleware<
  TReq extends ApiRequest = ApiRequest,
  TRes extends ApiResponse = ApiResponse
>(...middlewares: Middleware<TReq, TRes>[]): Middleware<TReq, TRes> {
  return defineMiddleware({
    name: 'composed',
    priority: 'normal',
    order: 0,
    enabled: true,
    handler: async (request, finalNext) => {
      let index = 0;
      const next = async (): Promise<TRes> => {
        if (index < middlewares.length) {
          const middleware = middlewares[index++];
          if (middleware.enabled) {
            return middleware.handler(request, next);
          }
          return next();
        }
        return finalNext();
      };
      return next();
    },
  });
}

// =============================================================================
// Middleware Hook
// =============================================================================

/**
 * Use middleware in the current context
 *
 * @example
 * ```ts
 * const pipeline = useMiddleware();
 * pipeline.use(loggingMiddleware());
 * pipeline.use(authMiddleware());
 * ```
 */
export function useMiddleware<
  TReq extends ApiRequest = ApiRequest,
  TRes extends ApiResponse = ApiResponse
>(): MiddlewarePipeline<TReq, TRes> {
  const pipeline = createPipeline<TReq, TRes>();

  // Register cleanup
  onCleanup(() => {
    pipeline.clear();
  });

  return pipeline;
}
