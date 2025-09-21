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

  // Build command array
  build() {
    if (!this._domain || !this._resource || !this._action) {
      throw new Error('Command must have domain, resource, and action')
    }

    const commandArray = [this._domain, this._resource, this._action]
    
    // Add arguments
    for (const [key, value] of Object.entries(this._args)) {
      commandArray.push(key, String(value))
    }

    // Add options
    for (const [key, value] of Object.entries(this._options)) {
      if (typeof value === 'boolean') {
        if (value) {
          commandArray.push(key)
        }
      } else {
        commandArray.push(key, String(value))
      }
    }

    return commandArray
  }

  // Execute command
  async execute(runner = 'local', options = {}) {
    const commandArray = this.build()
    const { runLocalCitty, runCitty } = await import('./index.js')
    
    const runnerOptions = {
      ...options,
      context: { ...this.context, ...options.context }
    }

    if (runner === 'local') {
      return runLocalCitty(commandArray, runnerOptions)
    } else if (runner === 'cleanroom') {
      return runCitty(commandArray, runnerOptions)
    } else {
      throw new Error(`Unknown runner: ${runner}`)
    }
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
    builder.domain = domainName
    return new ResourceBuilder(builder)
  }
  return builder
}

// Convenience functions for common patterns
export const cmd = command

// Domain-specific command builders
export const infra = () => command('infra')
export const dev = () => command('dev')
export const security = () => command('security')
export const monitor = () => command('monitor')
export const data = () => command('data')
export const compliance = () => command('compliance')
export const tenant = () => command('tenant')

// Resource-specific command builders
export const server = () => command().resource('infra', 'server')
export const network = () => command().resource('infra', 'network')
export const user = () => command().resource('security', 'user')
export const project = () => command().resource('dev', 'project')
export const test = () => command().resource('dev', 'test')
export const policy = () => command().resource('security', 'policy')
export const alert = () => command().resource('monitor', 'alert')
export const backup = () => command().resource('data', 'backup')

// Action-specific command builders
export const create = () => command()
export const list = () => command()
export const show = () => command()
export const update = () => command()
export const deleteCmd = () => command()
export const run = () => command()
export const deploy = () => command()
export const audit = () => command()
export const validate = () => command()
export const configure = () => command()
export const scale = () => command()

// Export all components
export default {
  CommandBuilder,
  ResourceBuilder,
  ActionBuilder,
  command,
  cmd,
  infra,
  dev,
  security,
  monitor,
  data,
  compliance,
  tenant,
  server,
  network,
  user,
  project,
  test,
  policy,
  alert,
  backup,
  create,
  list,
  show,
  update,
  delete: deleteCmd,
  run,
  deploy,
  audit,
  validate,
  configure,
  scale
}