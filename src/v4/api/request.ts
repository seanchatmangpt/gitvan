/**
 * GitVan v4 Request Handling
 *
 * Reactive request/response handling with hooks.
 *
 * @packageDocumentation
 * @module @gitvan/v4/api/request
 */

import type {
  ApiRequest,
  ApiResponse,
  HttpMethod,
  ValidationError,
  HookContext,
} from '../types/index.js';
import { signal, computed, effect, batch } from '../core/signals.js';
import {
  createContext,
  runInContextAsync,
  provide,
  Tokens,
  onCleanup,
} from '../core/context.js';
import { createErrorBoundary, formatErrorResponse, getErrorStatusCode } from '../errors/boundaries.js';

// Simple logger for error reporting
const logger = {
  error: (...args: any[]) => {
    if (typeof process !== 'undefined' && process.stderr) {
      process.stderr.write(`[ERROR] ${args.join(' ')}\n`);
    } else {
      console.error(...args);
    }
  }
};

// =============================================================================
// Request ID Generation
// =============================================================================

let requestIdCounter = 0;

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

// =============================================================================
// Request Builder
// =============================================================================

/**
 * Request builder for constructing API requests
 */
export class RequestBuilder<T = unknown> {
  private _method: HttpMethod = 'GET';
  private _path = '/';
  private _params: Record<string, string> = {};
  private _query: Record<string, string | string[]> = {};
  private _headers: Record<string, string> = {};
  private _body?: T;
  private _meta: Record<string, unknown> = {};
  private _signal?: AbortSignal;

  method(method: HttpMethod): this {
    this._method = method;
    return this;
  }

  path(path: string): this {
    this._path = path;
    return this;
  }

  param(key: string, value: string): this {
    this._params[key] = value;
    return this;
  }

  params(params: Record<string, string>): this {
    this._params = { ...this._params, ...params };
    return this;
  }

  query(key: string, value: string | string[]): this {
    this._query[key] = value;
    return this;
  }

  queries(query: Record<string, string | string[]>): this {
    this._query = { ...this._query, ...query };
    return this;
  }

  header(key: string, value: string): this {
    this._headers[key] = value;
    return this;
  }

  headers(headers: Record<string, string>): this {
    this._headers = { ...this._headers, ...headers };
    return this;
  }

  body<U>(body: U): RequestBuilder<U> {
    (this as unknown as RequestBuilder<U>)._body = body;
    return this as unknown as RequestBuilder<U>;
  }

  meta(key: string, value: unknown): this {
    this._meta[key] = value;
    return this;
  }

  signal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  build(context?: HookContext): ApiRequest<T> {
    return {
      id: generateRequestId(),
      method: this._method,
      path: this._path,
      params: this._params,
      query: this._query,
      headers: this._headers,
      body: this._body,
      context: context ?? createContext(),
      timestamp: Date.now(),
      signal: this._signal,
      meta: this._meta,
    };
  }
}

/**
 * Create a request builder
 *
 * @example
 * ```ts
 * const request = createRequest()
 *   .method('POST')
 *   .path('/api/users')
 *   .header('Content-Type', 'application/json')
 *   .body({ name: 'John' })
 *   .build();
 * ```
 */
export function createRequest<T = unknown>(): RequestBuilder<T> {
  return new RequestBuilder<T>();
}

// =============================================================================
// Response Builder
// =============================================================================

/**
 * Response builder for constructing API responses
 */
export class ResponseBuilder<T = unknown> {
  private _status = 200;
  private _statusText = 'OK';
  private _headers: Record<string, string> = {};
  private _body?: T;
  private _requestId = '';
  private _errors?: ValidationError[];

  status(status: number, statusText?: string): this {
    this._status = status;
    this._statusText = statusText ?? getStatusText(status);
    return this;
  }

  header(key: string, value: string): this {
    this._headers[key] = value;
    return this;
  }

  headers(headers: Record<string, string>): this {
    this._headers = { ...this._headers, ...headers };
    return this;
  }

  body<U>(body: U): ResponseBuilder<U> {
    (this as unknown as ResponseBuilder<U>)._body = body;
    return this as unknown as ResponseBuilder<U>;
  }

  json<U>(data: U): ResponseBuilder<U> {
    this._headers['Content-Type'] = 'application/json';
    return this.body(data);
  }

  requestId(id: string): this {
    this._requestId = id;
    return this;
  }

  errors(errors: ValidationError[]): this {
    this._errors = errors;
    return this;
  }

  build(startTime?: number): ApiResponse<T> {
    return {
      status: this._status,
      statusText: this._statusText,
      headers: this._headers,
      body: this._body,
      meta: {
        requestId: this._requestId,
        timestamp: Date.now(),
        duration: startTime ? Date.now() - startTime : 0,
        errors: this._errors,
      },
    };
  }
}

/**
 * Create a response builder
 *
 * @example
 * ```ts
 * const response = createResponse()
 *   .status(201)
 *   .json({ id: '123', name: 'John' })
 *   .build();
 * ```
 */
export function createResponse<T = unknown>(): ResponseBuilder<T> {
  return new ResponseBuilder<T>();
}

// =============================================================================
// Common Responses
// =============================================================================

/**
 * Create a success response
 */
export function ok<T>(body: T, requestId = ''): ApiResponse<T> {
  return createResponse<T>().status(200).json(body).requestId(requestId).build();
}

/**
 * Create a created response
 */
export function created<T>(body: T, location?: string, requestId = ''): ApiResponse<T> {
  const builder = createResponse<T>().status(201).json(body).requestId(requestId);
  if (location) {
    builder.header('Location', location);
  }
  return builder.build();
}

/**
 * Create a no content response
 */
export function noContent(requestId = ''): ApiResponse<void> {
  return createResponse<void>().status(204).requestId(requestId).build();
}

/**
 * Create a bad request response
 */
export function badRequest(
  message: string,
  errors?: ValidationError[],
  requestId = ''
): ApiResponse<{ error: string; errors?: ValidationError[] }> {
  return createResponse<{ error: string; errors?: ValidationError[] }>()
    .status(400)
    .json({ error: message, errors })
    .errors(errors ?? [])
    .requestId(requestId)
    .build();
}

/**
 * Create an unauthorized response
 */
export function unauthorized(
  message = 'Unauthorized',
  requestId = ''
): ApiResponse<{ error: string }> {
  return createResponse<{ error: string }>()
    .status(401)
    .json({ error: message })
    .requestId(requestId)
    .build();
}

/**
 * Create a forbidden response
 */
export function forbidden(
  message = 'Forbidden',
  requestId = ''
): ApiResponse<{ error: string }> {
  return createResponse<{ error: string }>()
    .status(403)
    .json({ error: message })
    .requestId(requestId)
    .build();
}

/**
 * Create a not found response
 */
export function notFound(
  resource?: string,
  requestId = ''
): ApiResponse<{ error: string }> {
  const message = resource ? `${resource} not found` : 'Not found';
  return createResponse<{ error: string }>()
    .status(404)
    .json({ error: message })
    .requestId(requestId)
    .build();
}

/**
 * Create an internal server error response
 */
export function serverError(
  error: Error,
  options?: { expose?: boolean },
  requestId = ''
): ApiResponse<Record<string, unknown>> {
  const body = formatErrorResponse(error, {
    includeStack: options?.expose,
  });
  return createResponse<Record<string, unknown>>()
    .status(getErrorStatusCode(error))
    .json(body)
    .requestId(requestId)
    .build();
}

// =============================================================================
// Request Hook
// =============================================================================

/**
 * Request state
 */
export interface RequestState<T = unknown> {
  request: ApiRequest<T> | null;
  isLoading: boolean;
  startTime: number | null;
}

/**
 * Use request in current context
 *
 * @example
 * ```ts
 * const { request, parse, validate } = useRequest<CreateUserInput>();
 * const body = await parse();
 * const validated = validate(body, schema);
 * ```
 */
export function useRequest<T = unknown>(
  initialRequest?: ApiRequest<T>
): {
  request: ApiRequest<T> | null;
  setRequest: (req: ApiRequest<T>) => void;
  parse: () => Promise<T | undefined>;
  getParam: (key: string, defaultValue?: string) => string | undefined;
  getQuery: (key: string) => string | string[] | undefined;
  getHeader: (key: string) => string | undefined;
  hasHeader: (key: string) => boolean;
} {
  const requestSignal = signal<ApiRequest<T> | null>(initialRequest ?? null);

  return {
    get request() {
      return requestSignal();
    },

    setRequest(req: ApiRequest<T>) {
      requestSignal.set(req);
    },

    async parse(): Promise<T | undefined> {
      return requestSignal()?.body;
    },

    getParam(key: string, defaultValue?: string): string | undefined {
      return requestSignal()?.params[key] ?? defaultValue;
    },

    getQuery(key: string): string | string[] | undefined {
      return requestSignal()?.query[key];
    },

    getHeader(key: string): string | undefined {
      const headers = requestSignal()?.headers ?? {};
      // Case-insensitive header lookup
      const lowerKey = key.toLowerCase();
      for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === lowerKey) {
          return v;
        }
      }
      return undefined;
    },

    hasHeader(key: string): boolean {
      return this.getHeader(key) !== undefined;
    },
  };
}

// =============================================================================
// Response Hook
// =============================================================================

/**
 * Use response builder in current context
 *
 * @example
 * ```ts
 * const { json, error, send } = useResponse();
 * return json({ users: await getUsers() });
 * ```
 */
export function useResponse<T = unknown>(requestId = ''): {
  json: <U>(data: U, status?: number) => ApiResponse<U>;
  text: (data: string, status?: number) => ApiResponse<string>;
  redirect: (url: string, status?: 301 | 302 | 307 | 308) => ApiResponse<void>;
  error: (err: Error) => ApiResponse<Record<string, unknown>>;
  status: (code: number) => ResponseBuilder<T>;
} {
  return {
    json<U>(data: U, status = 200): ApiResponse<U> {
      return createResponse<U>()
        .status(status)
        .json(data)
        .requestId(requestId)
        .build();
    },

    text(data: string, status = 200): ApiResponse<string> {
      return createResponse<string>()
        .status(status)
        .header('Content-Type', 'text/plain')
        .body(data)
        .requestId(requestId)
        .build();
    },

    redirect(url: string, status: 301 | 302 | 307 | 308 = 302): ApiResponse<void> {
      return createResponse<void>()
        .status(status)
        .header('Location', url)
        .requestId(requestId)
        .build();
    },

    error(err: Error): ApiResponse<Record<string, unknown>> {
      return serverError(err, { expose: false }, requestId);
    },

    status(code: number): ResponseBuilder<T> {
      return createResponse<T>().status(code).requestId(requestId);
    },
  };
}

// =============================================================================
// Request Handler
// =============================================================================

/**
 * Handler context provided to request handlers
 */
export interface HandlerContext<TReq = unknown> {
  request: ApiRequest<TReq>;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: TReq | undefined;
  headers: Record<string, string>;
  json: <U>(data: U, status?: number) => ApiResponse<U>;
  error: (err: Error) => ApiResponse<Record<string, unknown>>;
  notFound: (resource?: string) => ApiResponse<{ error: string }>;
  badRequest: (message: string) => ApiResponse<{ error: string }>;
}

/**
 * Create a request handler with context
 *
 * @example
 * ```ts
 * const handler = createHandler<CreateUserInput>(async (ctx) => {
 *   const user = await createUser(ctx.body);
 *   return ctx.json(user, 201);
 * });
 * ```
 */
export function createHandler<TReq = unknown, TRes = unknown>(
  handler: (ctx: HandlerContext<TReq>) => Promise<ApiResponse<TRes>>
): (request: ApiRequest<TReq>) => Promise<ApiResponse<TRes>> {
  return async (request: ApiRequest<TReq>) => {
    const startTime = Date.now();
    const context = createContext(request.context);
    const response = useResponse<TRes>(request.id);

    const ctx: HandlerContext<TReq> = {
      request,
      params: request.params,
      query: request.query,
      body: request.body,
      headers: request.headers,
      json: response.json,
      error: response.error,
      notFound: (resource) => notFound(resource, request.id),
      badRequest: (message) => badRequest(message, undefined, request.id),
    };

    return runInContextAsync(context, async () => {
      const boundary = createErrorBoundary({
        onError: (err) => logger.error('Handler error:', err),
      });

      try {
        return await boundary.wrap(() => handler(ctx));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return serverError(error, { expose: false }, request.id);
      }
    });
  };
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get status text for HTTP status code
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  return statusTexts[status] ?? 'Unknown';
}

/**
 * Parse query string into object
 */
export function parseQuery(queryString: string): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  const params = new URLSearchParams(queryString);

  for (const [key, value] of params.entries()) {
    if (key in query) {
      const existing = query[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        query[key] = [existing, value];
      }
    } else {
      query[key] = value;
    }
  }

  return query;
}

/**
 * Build query string from object
 */
export function buildQuery(query: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, v);
      }
    } else {
      params.set(key, value);
    }
  }

  return params.toString();
}
