// command-builder.js - Enterprise Command Builder System
// Implements fluent API for noun-verb command construction

/**
 * Command Builder Interface for Enterprise Noun-Verb CLI Testing
 * Supports both domain-first and resource-first approaches
 */

export class CommandBuilder {
  constructor() {
    this._domain = null
    this._resource = null
    this._action = null
    this._args = {}
    this._options = {}
    this._context = {}
  }

  // Domain-first approach
  domain(domainName) {
    this._domain = domainName
    return new ResourceBuilder(this)
  }

  // Resource-first approach
  resource(domainName, resourceName) {
    this._domain = domainName
    this._resource = resourceName
    return new ActionBuilder(this)
  }

  // Direct command construction
  command(domainName, resourceName, actionName) {
    this._domain = domainName
    this._resource = resourceName
    this._action = actionName
    return this
  }

  // Argument management
  arg(name, value) {
    this._args[name] = value
    return this
  }

  args(argsObj) {
    this._args = { ...this._args, ...argsObj }
    return this
  }

  // Option management
  option(name, value) {
    this._options[name] = value
    return this
  }

  options(optionsObj) {
    this._options = { ...this._options, ...optionsObj }
    return this
  }

  // Context management
  context(contextObj) {
    this._context = { ...this._context, ...contextObj }
    return this
  }

  // Build command object
  build() {
    if (!this._domain || !this._resource || !this._action) {
      throw new Error('Command must have domain, resource, and action')
    }

    const args = []
    // Add arguments
    for (const [key, value] of Object.entries(this._args)) {
      args.push(key, String(value))
    }

    // Add options
    for (const [key, value] of Object.entries(this._options)) {
      if (typeof value === 'boolean') {
        if (value) {
          args.push(key, true)
        }
      } else {
        args.push(key, String(value))
      }
    }

    return [this._domain, this._resource, this._action, ...args]
  }

  // Execute command
  async execute(runner = 'local', options = {}) {
    const commandArray = this.build()
    const { runLocalCitty, runCitty } = await import('./index.js')

    const runnerOptions = {
      ...options,
      context: { ...this._context, ...options.context },
    }

    if (runner === 'local') {
      return runLocalCitty(commandArray, runnerOptions)
    } else if (runner === 'cleanroom') {
      return runCitty(commandArray, runnerOptions)
    } else {
      throw new Error(`Unknown runner: ${runner}`)
    }
  }

  // Convenience methods for common arguments
  withName(name) {
    this._args['--name'] = name
    return this
  }

  withType(type) {
    this._args['--type'] = type
    return this
  }

  withRegion(region) {
    this._args['--region'] = region
    return this
  }

  withSize(size) {
    this._args['--size'] = size
    return this
  }

  withConfig(config) {
    this._args['--config'] = config
    return this
  }

  withEnvironment(env) {
    this._args['--environment'] = env
    return this
  }

  withCompliance(compliance) {
    this._args['--compliance'] = compliance
    return this
  }

  withUser(user) {
    this._args['--user'] = user
    return this
  }

  withRole(role) {
    this._args['--role'] = role
    return this
  }

  withWorkspace(workspace) {
    this._args['--workspace'] = workspace
    return this
  }

  // Getters for test access
  getDomain() {
    return this._domain
  }
  getResource() {
    return this._resource
  }
  getAction() {
    return this._action
  }
  getArgs() {
    return this._args
  }
  getOptions() {
    return this._options
  }
  getContext() {
    return this._context
  }
}

export class ResourceBuilder {
  constructor(commandBuilder) {
    this.commandBuilder = commandBuilder
  }

  resource(resourceName) {
    this.commandBuilder._resource = resourceName
    return new ActionBuilder(this.commandBuilder)
  }

  // Common resources
  server() {
    this.commandBuilder._resource = 'server'
    return new ActionBuilder(this.commandBuilder)
  }

  network() {
    this.commandBuilder._resource = 'network'
    return new ActionBuilder(this.commandBuilder)
  }

  storage() {
    this.commandBuilder._resource = 'storage'
    return new ActionBuilder(this.commandBuilder)
  }

  database() {
    this.commandBuilder._resource = 'database'
    return new ActionBuilder(this.commandBuilder)
  }

  user() {
    this.commandBuilder._resource = 'user'
    return new ActionBuilder(this.commandBuilder)
  }

  project() {
    this.commandBuilder._resource = 'project'
    return new ActionBuilder(this.commandBuilder)
  }

  app() {
    this.commandBuilder._resource = 'app'
    return new ActionBuilder(this.commandBuilder)
  }

  test() {
    this.commandBuilder._resource = 'test'
    return new ActionBuilder(this.commandBuilder)
  }

  scenario() {
    this.commandBuilder._resource = 'scenario'
    return new ActionBuilder(this.commandBuilder)
  }

  snapshot() {
    this.commandBuilder._resource = 'snapshot'
    return new ActionBuilder(this.commandBuilder)
  }

  role() {
    this.commandBuilder._resource = 'role'
    return new ActionBuilder(this.commandBuilder)
  }

  policy() {
    this.commandBuilder._resource = 'policy'
    return new ActionBuilder(this.commandBuilder)
  }

  secret() {
    this.commandBuilder._resource = 'secret'
    return new ActionBuilder(this.commandBuilder)
  }

  certificate() {
    this.commandBuilder._resource = 'certificate'
    return new ActionBuilder(this.commandBuilder)
  }
}

export class ActionBuilder {
  constructor(commandBuilder) {
    this.commandBuilder = commandBuilder
  }

  action(actionName) {
    this.commandBuilder._action = actionName
    return this.commandBuilder
  }

  // Common actions
  create() {
    this.commandBuilder._action = 'create'
    return this.commandBuilder
  }

  list() {
    this.commandBuilder._action = 'list'
    return this.commandBuilder
  }

  show() {
    this.commandBuilder._action = 'show'
    return this.commandBuilder
  }

  update() {
    this.commandBuilder._action = 'update'
    return this.commandBuilder
  }

  delete() {
    this.commandBuilder._action = 'delete'
    return this.commandBuilder
  }

  run() {
    this.commandBuilder._action = 'run'
    return this.commandBuilder
  }

  deploy() {
    this.commandBuilder._action = 'deploy'
    return this.commandBuilder
  }

  audit() {
    this.commandBuilder._action = 'audit'
    return this.commandBuilder
  }

  validate() {
    this.commandBuilder._action = 'validate'
    return this.commandBuilder
  }

  configure() {
    this.commandBuilder._action = 'configure'
    return this.commandBuilder
  }

  schedule() {
    this.commandBuilder._action = 'schedule'
    return this.commandBuilder
  }

  restart() {
    this.commandBuilder._action = 'restart'
    return this.commandBuilder
  }

  scale() {
    this.commandBuilder._action = 'scale'
    return this.commandBuilder
  }

  backup() {
    this.commandBuilder._action = 'backup'
    return this.commandBuilder
  }

  restore() {
    this.commandBuilder._action = 'restore'
    return this.commandBuilder
  }
}

// Factory function for creating command builders
export function command(domainName = null) {
  const builder = new CommandBuilder()
  if (domainName) {
    builder._domain = domainName
    return new ResourceBuilder(builder)
  }
  return builder
}

// Resource-first approach
export function createCommand() {
  return new CommandBuilder()
}

// Domain-specific builders
export const infra = {
  server: () => command('infra').server(),
  network: () => command('infra').network(),
  storage: () => command('infra').storage(),
  database: () => command('infra').database(),
}

export const dev = {
  project: () => command('dev').project(),
  app: () => command('dev').app(),
  test: () => command('dev').test(),
  scenario: () => command('dev').scenario(),
  snapshot: () => command('dev').snapshot(),
}

export const security = {
  user: () => command('security').user(),
  role: () => command('security').role(),
  policy: () => command('security').policy(),
  secret: () => command('security').secret(),
  certificate: () => command('security').certificate(),
}

// Enterprise convenience functions for common command patterns
export const enterprise = {
  infra: {
    server: {
      create: (options = {}, args = {}, context = {}) => {
        const builder = command('infra').server().create()
        return builder.args(args).options(options).context(context)
      },
      list: (options = {}, args = {}, context = {}) => {
        const builder = command('infra').server().list()
        return builder.args(args).options(options).context(context)
      },
      show: (options = {}, args = {}, context = {}) => {
        const builder = command('infra').server().show()
        // Handle single string parameter as --id arg
        if (typeof options === 'string') {
          builder.arg('--id', options)
          return builder.args(args).context(context)
        }
        return builder.args(args).options(options).context(context)
      },
      update: (options = {}, args = {}, context = {}) => {
        const builder = command('infra').server().update()
        return builder.args(args).options(options).context(context)
      },
      delete: (options = {}, args = {}, context = {}) => {
        const builder = command('infra').server().delete()
        return builder.args(args).options(options).context(context)
      },
    },
    network: {
      create: (options = {}, args = {}, context = {}) => {
        const builder = command('infra').network().create()
        return builder.args(args).options(options).context(context)
      },
      configure: (options = {}, args = {}, context = {}) => {
        const builder = command('infra').network().configure()
        return builder.args(args).options(options).context(context)
      },
    },
  },
  dev: {
    project: {
      create: (options = {}, args = {}, context = {}) => {
        const builder = command('dev').project().create()
        return builder.args(args).options(options).context(context)
      },
      deploy: (options = {}, args = {}, context = {}) => {
        const builder = command('dev').project().deploy()
        // Handle two-parameter pattern: (id, options)
        if (typeof options === 'string' && typeof args === 'object' && !Array.isArray(args)) {
          builder.arg('--id', options)
          return builder.options(args).context(context)
        }
        return builder.args(args).options(options).context(context)
      },
    },
    test: {
      run: (options = {}, args = {}, context = {}) => {
        const builder = command('dev').test().run()
        return builder.args(args).options(options).context(context)
      },
      schedule: (options = {}, args = {}, context = {}) => {
        const builder = command('dev').test().schedule()
        return builder.args(args).options(options).context(context)
      },
    },
  },
  security: {
    user: {
      create: (options = {}, args = {}, context = {}) => {
        const builder = command('security').user().create()
        return builder.args(args).options(options).context(context)
      },
      list: (options = {}, args = {}, context = {}) => {
        const builder = command('security').user().list()
        return builder.args(args).options(options).context(context)
      },
      audit: (options = {}, args = {}, context = {}) => {
        const builder = command('security').user().audit()
        // Handle two-parameter pattern: (id, options)
        if (typeof options === 'string' && typeof args === 'object' && !Array.isArray(args)) {
          builder.arg('--id', options)
          return builder.options(args).context(context)
        }
        return builder.args(args).options(options).context(context)
      },
    },
    policy: {
      validate: (options = {}, args = {}, context = {}) => {
        const builder = command('security').policy().validate()
        return builder.args(args).options(options).context(context)
      },
      enforce: (options = {}, args = {}, context = {}) => {
        const builder = command('security').policy().enforce()
        return builder.args(args).options(options).context(context)
      },
    },
  },
}
