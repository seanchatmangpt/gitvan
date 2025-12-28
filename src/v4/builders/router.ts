/**
 * GitVan v4 API Router Builder
 *
 * Composable router for building type-safe APIs with hooks.
 *
 * @packageDocumentation
 * @module @gitvan/v4/builders/router
 */

import type {
  ApiRequest,
  ApiResponse,
  RouteDefinition,
  EndpointBuilder,
  ApiRouter,
  Middleware,
  HttpMethod,
  RouteHandler,
} from '../types/index.js';
import { signal, computed } from '../core/signals.js';
import { createPipeline, type MiddlewarePipeline } from '../middleware/pipeline.js';
import { createHandler, createResponse, serverError } from '../api/request.js';

// =============================================================================
// Route Matching
// =============================================================================

interface RouteMatch {
  route: RouteDefinition;
  params: Record<string, string>;
}

/**
 * Match a path against a route pattern
 */
function matchRoute(
  path: string,
  pattern: string
): { matched: boolean; params: Record<string, string> } {
  const params: Record<string, string> = {};

  // Convert pattern to regex
  const regexParts = pattern.split('/').map((part) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1);
      // Check for optional param
      if (paramName.endsWith('?')) {
        return `(?<${paramName.slice(0, -1)}>[^/]+)?`;
      }
      return `(?<${paramName}>[^/]+)`;
    }
    if (part === '*') {
      return '[^/]+';
    }
    if (part === '**') {
      return '.*';
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });

  const regex = new RegExp(`^${regexParts.join('/')}$`);
  const match = path.match(regex);

  if (match) {
    if (match.groups) {
      Object.assign(params, match.groups);
    }
    return { matched: true, params };
  }

  return { matched: false, params: {} };
}

// =============================================================================
// Endpoint Builder Implementation
// =============================================================================

class EndpointBuilderImpl<TReq = ApiRequest, TRes = unknown>
  implements EndpointBuilder<TReq, TRes>
{
  private _method: HttpMethod;
  private _path: string;
  private _middleware: Middleware[] = [];
  private _meta: Record<string, unknown> = {};
  private _requestSchema?: unknown;
  private _responseSchema?: unknown;

  constructor(method: HttpMethod, path: string) {
    this._method = method;
    this._path = path;
  }

  input<T>(schema: T): EndpointBuilder<TReq & { body: T }, TRes> {
    this._requestSchema = schema;
    return this as unknown as EndpointBuilder<TReq & { body: T }, TRes>;
  }

  output<T>(schema: T): EndpointBuilder<TReq, T> {
    this._responseSchema = schema;
    return this as unknown as EndpointBuilder<TReq, T>;
  }

  use(middleware: Middleware): EndpointBuilder<TReq, TRes> {
    this._middleware.push(middleware);
    return this;
  }

  meta(data: Record<string, unknown>): EndpointBuilder<TReq, TRes> {
    this._meta = { ...this._meta, ...data };
    return this;
  }

  handler(fn: RouteHandler<TReq, TRes>): RouteDefinition<TReq, TRes> {
    return {
      method: this._method,
      path: this._path,
      handler: fn,
      middleware: this._middleware,
      meta: this._meta,
      requestSchema: this._requestSchema,
      responseSchema: this._responseSchema,
    };
  }
}

// =============================================================================
// Router Implementation
// =============================================================================

/**
 * Create a new API router
 *
 * @example
 * ```ts
 * const router = createRouter();
 *
 * const getUsers = router.get('/users')
 *   .output(UsersSchema)
 *   .handler(async (req) => {
 *     return { users: await db.users.findMany() };
 *   });
 *
 * const createUser = router.post('/users')
 *   .input(CreateUserSchema)
 *   .output(UserSchema)
 *   .handler(async (req) => {
 *     return await db.users.create(req.body);
 *   });
 * ```
 */
export function createRouter(basePath = ''): ApiRouter {
  const routes = signal<RouteDefinition[]>([]);
  const globalMiddleware = signal<Middleware[]>([]);
  const subRouters = signal<Array<{ prefix: string; router: ApiRouter }>>([]);

  const router: ApiRouter = {
    get<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes> {
      return new EndpointBuilderImpl<ApiRequest, TRes>('GET', basePath + path);
    },

    post<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes> {
      return new EndpointBuilderImpl<ApiRequest, TRes>('POST', basePath + path);
    },

    put<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes> {
      return new EndpointBuilderImpl<ApiRequest, TRes>('PUT', basePath + path);
    },

    patch<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes> {
      return new EndpointBuilderImpl<ApiRequest, TRes>('PATCH', basePath + path);
    },

    delete<TRes = unknown>(path: string): EndpointBuilder<ApiRequest, TRes> {
      return new EndpointBuilderImpl<ApiRequest, TRes>('DELETE', basePath + path);
    },

    mount(prefix: string, subRouter: ApiRouter): ApiRouter {
      subRouters.update((list) => [...list, { prefix: basePath + prefix, router: subRouter }]);
      return this;
    },

    getRoutes(): ReadonlyArray<RouteDefinition> {
      const allRoutes = [...routes()];

      // Include routes from sub-routers
      for (const { prefix, router: subRouter } of subRouters()) {
        for (const route of subRouter.getRoutes()) {
          allRoutes.push({
            ...route,
            path: prefix + route.path,
          });
        }
      }

      return allRoutes;
    },

    use(middleware: Middleware): ApiRouter {
      globalMiddleware.update((list) => [...list, middleware]);
      return this;
    },
  };

  // Override get/post/etc to register routes
  const originalMethods = ['get', 'post', 'put', 'patch', 'delete'] as const;
  for (const method of originalMethods) {
    const original = router[method].bind(router);
    (router as any)[method] = <TRes = unknown>(path: string) => {
      const builder = original(path) as EndpointBuilderImpl<ApiRequest, TRes>;
      const originalHandler = builder.handler.bind(builder);

      builder.handler = (fn: RouteHandler<ApiRequest, TRes>) => {
        const route = originalHandler(fn);
        routes.update((list) => [...list, route as RouteDefinition]);
        return route;
      };

      return builder;
    };
  }

  return router;
}

// =============================================================================
// Router Handler
// =============================================================================

/**
 * Create a request handler from a router
 *
 * @example
 * ```ts
 * const router = createRouter();
 * // ... define routes ...
 *
 * const handler = createRouterHandler(router);
 * const response = await handler(request);
 * ```
 */
export function createRouterHandler(
  router: ApiRouter,
  options?: {
    notFoundHandler?: (request: ApiRequest) => ApiResponse;
    errorHandler?: (error: Error, request: ApiRequest) => ApiResponse;
  }
): (request: ApiRequest) => Promise<ApiResponse> {
  const pipeline = createPipeline();

  return async (request: ApiRequest): Promise<ApiResponse> => {
    const routes = router.getRoutes();

    // Find matching route
    let matchedRoute: RouteMatch | null = null;

    for (const route of routes) {
      if (route.method !== request.method) continue;

      const match = matchRoute(request.path, route.path);
      if (match.matched) {
        matchedRoute = { route, params: match.params };
        break;
      }
    }

    if (!matchedRoute) {
      if (options?.notFoundHandler) {
        return options.notFoundHandler(request);
      }
      return createResponse()
        .status(404)
        .json({ error: 'Not found' })
        .requestId(request.id)
        .build();
    }

    const { route, params } = matchedRoute;

    // Apply route params to request
    const requestWithParams: ApiRequest = {
      ...request,
      params: { ...request.params, ...params },
    };

    // Build middleware pipeline for this route
    const routePipeline = createPipeline();
    if (route.middleware) {
      for (const mw of route.middleware) {
        routePipeline.use(mw);
      }
    }

    try {
      return await routePipeline.execute(requestWithParams, async () => {
        const result = await route.handler(requestWithParams);

        // If handler returns a response, use it directly
        if (isApiResponse(result)) {
          return result;
        }

        // Otherwise, wrap in a JSON response
        return createResponse()
          .status(200)
          .json(result)
          .requestId(request.id)
          .build();
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (options?.errorHandler) {
        return options.errorHandler(err, request);
      }
      return serverError(err, { expose: false }, request.id);
    }
  };
}

/**
 * Check if a value is an ApiResponse
 */
function isApiResponse(value: unknown): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'headers' in value &&
    'meta' in value
  );
}

// =============================================================================
// Resource Router
// =============================================================================

/**
 * Resource controller interface
 */
export interface ResourceController<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list?: (request: ApiRequest) => Promise<T[]>;
  get?: (id: string, request: ApiRequest) => Promise<T | null>;
  create?: (data: TCreate, request: ApiRequest) => Promise<T>;
  update?: (id: string, data: TUpdate, request: ApiRequest) => Promise<T | null>;
  delete?: (id: string, request: ApiRequest) => Promise<boolean>;
}

/**
 * Create a RESTful resource router
 *
 * @example
 * ```ts
 * const userRouter = createResourceRouter('/users', {
 *   list: async () => db.users.findMany(),
 *   get: async (id) => db.users.findById(id),
 *   create: async (data) => db.users.create(data),
 *   update: async (id, data) => db.users.update(id, data),
 *   delete: async (id) => db.users.delete(id),
 * });
 * ```
 */
export function createResourceRouter<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  basePath: string,
  controller: ResourceController<T, TCreate, TUpdate>
): ApiRouter {
  const router = createRouter(basePath);

  // GET /resources - List all
  if (controller.list) {
    router.get('/')
      .handler(async (request) => {
        const items = await controller.list!(request);
        return { data: items };
      });
  }

  // GET /resources/:id - Get one
  if (controller.get) {
    router.get('/:id')
      .handler(async (request) => {
        const id = request.params.id;
        const item = await controller.get!(id, request);
        if (!item) {
          return createResponse()
            .status(404)
            .json({ error: 'Resource not found' })
            .build();
        }
        return { data: item };
      });
  }

  // POST /resources - Create
  if (controller.create) {
    router.post('/')
      .handler(async (request) => {
        const item = await controller.create!(request.body as TCreate, request);
        return createResponse()
          .status(201)
          .json({ data: item })
          .build();
      });
  }

  // PUT /resources/:id - Update
  if (controller.update) {
    router.put('/:id')
      .handler(async (request) => {
        const id = request.params.id;
        const item = await controller.update!(id, request.body as TUpdate, request);
        if (!item) {
          return createResponse()
            .status(404)
            .json({ error: 'Resource not found' })
            .build();
        }
        return { data: item };
      });
  }

  // DELETE /resources/:id - Delete
  if (controller.delete) {
    router.delete('/:id')
      .handler(async (request) => {
        const id = request.params.id;
        const deleted = await controller.delete!(id, request);
        if (!deleted) {
          return createResponse()
            .status(404)
            .json({ error: 'Resource not found' })
            .build();
        }
        return createResponse()
          .status(204)
          .build();
      });
  }

  return router;
}

// =============================================================================
// Router Group
// =============================================================================

/**
 * Create a router group with shared configuration
 *
 * @example
 * ```ts
 * const adminRoutes = routerGroup('/admin', {
 *   middleware: [authMiddleware({ role: 'admin' })],
 * }, (router) => {
 *   router.get('/users').handler(getUsers);
 *   router.get('/stats').handler(getStats);
 * });
 * ```
 */
export function routerGroup(
  prefix: string,
  options: {
    middleware?: Middleware[];
  },
  configure: (router: ApiRouter) => void
): ApiRouter {
  const router = createRouter(prefix);

  // Apply middleware
  if (options.middleware) {
    for (const mw of options.middleware) {
      router.use(mw);
    }
  }

  // Configure routes
  configure(router);

  return router;
}
