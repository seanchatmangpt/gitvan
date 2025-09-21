export interface CliResult {
  exitCode: number
  stdout: string
  stderr: string
  json?: unknown
  cwd: string
  args: string[]
  duration?: number
}

export interface CliExpectation {
  expectExit(code: number): this
  expectOutput(match: string | RegExp): this
  expectStderr(match: string | RegExp): this
  expectJson<T = any>(matcher?: (json: T) => void): this
  expectSuccess(): this
  expectFailure(): this
  expectNoOutput(): this
  expectNoStderr(): this
  expectOutputLength(minLength: number, maxLength?: number): this
  expectStderrLength(minLength: number, maxLength?: number): this
  expectExitCodeIn(codes: number[]): this
  expectOutputContains(text: string): this
  expectStderrContains(text: string): this
  expectOutputNotContains(text: string): this
  expectStderrNotContains(text: string): this
  expectDuration(maxDuration: number): this

  // Snapshot testing methods
  expectSnapshot(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotStdout(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotStderr(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotJson(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotFull(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotOutput(snapshotName: string, options?: SnapshotOptions): this

  result: CliResult
}

export interface RunOptions {
  cwd?: string
  env?: Record<string, string>
  json?: boolean
  timeout?: number
}

export interface Cleanroom {
  runCitty(args: string[], opts?: RunOptions): Promise<CliExpectation>
  stop(): Promise<void>
}

export interface CleanroomStatic {
  setup(options?: { rootDir?: string; nodeImage?: string }): Promise<Cleanroom>
  teardown(): Promise<void>
}

export const CittyCleanroom: CleanroomStatic

export function runLocalCitty(args: string[], opts?: RunOptions): Promise<CliResult>

// Scenario DSL types
export interface ScenarioStep {
  description: string
  command: {
    args: string[]
    options: RunOptions
  } | null
  expectations: Array<(result: CliExpectation) => void>
}

export interface ScenarioResult {
  scenario: string
  results: Array<{
    step: string
    success: boolean
    result?: CliExpectation
    error?: string
  }>
  success: boolean
  lastResult?: CliExpectation
}

export interface ScenarioBuilder {
  step(description: string): this
  run(args: string[], options?: RunOptions): this
  expect(expectationFn: (result: CliExpectation) => void): this
  execute(runner?: 'local' | 'cleanroom'): Promise<ScenarioResult>

  // Convenience methods
  expectSuccess(): this
  expectFailure(): this
  expectExit(code: number): this
  expectOutput(match: string | RegExp): this
  expectStderr(match: string | RegExp): this
  expectNoOutput(): this
  expectNoStderr(): this
  expectJson(validator?: (json: any) => void): this

  // Snapshot testing methods
  expectSnapshot(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotStdout(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotStderr(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotJson(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotFull(snapshotName: string, options?: SnapshotOptions): this
  expectSnapshotOutput(snapshotName: string, options?: SnapshotOptions): this

  // Snapshot step method
  snapshot(snapshotName: string, options?: SnapshotOptions): this
}

export function scenario(name: string): ScenarioBuilder
export function cleanroomScenario(name: string): ScenarioBuilder
export function localScenario(name: string): ScenarioBuilder

// Scenario execution result
export interface ScenarioExecutionResult {
  success: boolean
  result?: CliResult
  results?: CliResult[]
}

// Scenario executor interface
export interface ScenarioExecutor {
  execute(): Promise<ScenarioExecutionResult>
}

// Scenarios pack types
export type Environment = 'local' | 'cleanroom'

export const scenarios: {
  help(env?: Environment): ScenarioExecutor
  version(env?: Environment): ScenarioExecutor
  invalidCommand(cmd?: string, env?: Environment): ScenarioExecutor
  initProject(name: string, env?: Environment): ScenarioExecutor
  configGet(key: string, env?: Environment): ScenarioExecutor
  configSet(key: string, value: string, env?: Environment): ScenarioExecutor
  subcommand(cmd: string, args?: string[], env?: Environment): ScenarioExecutor
  jsonOutput(args: string[], env?: Environment): ScenarioExecutor
  fileGenerated(args: string[], expectPath: string, env?: Environment): ScenarioExecutor
  idempotent(args: string[], env?: Environment): ScenarioExecutor
  concurrent(
    runs: Array<{ args: string[]; opts?: RunOptions }>,
    env?: Environment
  ): ScenarioExecutor
  interactive(script: string, env?: Environment): ScenarioExecutor
  errorCase(args: string[], msgOrRe: string | RegExp, env?: Environment): ScenarioExecutor

  // Snapshot testing scenarios
  snapshotHelp(env?: Environment): ScenarioExecutor
  snapshotVersion(env?: Environment): ScenarioExecutor
  snapshotError(env?: Environment): ScenarioExecutor
  snapshotFull(env?: Environment): ScenarioExecutor
  snapshotWorkflow(env?: Environment): ScenarioExecutor
  snapshotJson(env?: Environment): ScenarioExecutor
  snapshotOutput(env?: Environment): ScenarioExecutor
}

export const testUtils: {
  waitFor: (
    conditionFn: () => Promise<boolean>,
    timeout?: number,
    interval?: number
  ) => Promise<boolean>
  retry: <T>(runnerFn: () => Promise<T>, maxAttempts?: number, delay?: number) => Promise<T>
  createTempFile: (content: string, extension?: string) => Promise<string>
  cleanupTempFiles: (files: string[]) => Promise<void>
}

// Snapshot testing types
export interface SnapshotOptions {
  testFile?: string
  type?: 'stdout' | 'stderr' | 'json' | 'full' | 'output'
  env?: Record<string, string>
  cwd?: string
}

export interface SnapshotConfig {
  snapshotDir: string
  updateSnapshots: boolean
  ciMode: boolean
  ignoreWhitespace: boolean
  ignoreTimestamps: boolean
  maxDiffSize: number
  customMatchers: any[]
}

export interface SnapshotResult {
  match: boolean
  created?: boolean
  updated?: boolean
  message?: string
  error?: string
  snapshotPath?: string
  comparison?: any
}

export interface SnapshotData {
  data: any
  metadata: {
    created: string
    testFile: string
    snapshotName: string
    options: SnapshotOptions
    version: string
  }
}

export interface SnapshotManager {
  config: SnapshotConfig
  generateKey(testName: string, snapshotName: string, options?: any): string
  getSnapshotPath(testFile: string, snapshotName: string): string
  loadSnapshot(snapshotPath: string): SnapshotData | null
  saveSnapshot(snapshotPath: string, snapshotData: SnapshotData): boolean
  normalizeData(data: any): any
  compareData(current: any, expected: any, path?: string): any
  matchSnapshot(
    currentData: any,
    testFile: string,
    snapshotName: string,
    options?: SnapshotOptions
  ): SnapshotResult
  cleanup(): void
  getStats(): any
}

export interface SnapshotUtils {
  createSnapshotFromResult(result: CliResult, type?: string): any
  createSnapshot(data: any, metadata?: any): SnapshotData
  validateSnapshot(snapshotData: any): { valid: boolean; error?: string }
}

// Snapshot testing exports
export class SnapshotConfig {
  constructor(options?: Partial<SnapshotConfig>)
}

export class SnapshotManager {
  constructor(config?: SnapshotConfig)
}

export function getSnapshotManager(config?: SnapshotConfig): SnapshotManager
export function resetSnapshotManager(): void
export function matchSnapshot(
  currentData: any,
  testFile: string,
  snapshotName: string,
  options?: SnapshotOptions
): SnapshotResult
export const snapshotUtils: SnapshotUtils

// Enterprise Noun-Verb CLI Testing Framework Types

// Command Builder Types
export interface CommandBuilder {
  domain: string | null
  resource: string | null
  action: string | null
  args: string[]
  options: Record<string, any>
  context: Record<string, any>
}

export interface BuiltCommand {
  domain: string
  resource: string
  action: string
  args: string[]
  options: Record<string, any>
  context: Record<string, any>
  command: string
  fullCommand: string
}

// Domain Registry Types
export interface Domain {
  name: string
  displayName: string
  description: string
  category: string
  compliance: string[]
  governance: string[]
  resources: Resource[]
  actions: Action[]
}

export interface Resource {
  name: string
  displayName: string
  description: string
  actions: string[]
  attributes: string[]
  relationships: string[]
}

export interface Action {
  name: string
  description: string
  category: string
  requires: string[]
  optional: string[]
}

export interface DomainRegistry {
  registerDomain(domain: Domain): this
  getDomain(name: string): Domain | undefined
  getAllDomains(): Domain[]
  getDomainResources(domainName: string): Resource[]
  getDomainActions(domainName: string): Action[]
  getResource(domainName: string, resourceName: string): Resource | undefined
  getAction(domainName: string, actionName: string): Action | undefined
  validateCommand(domain: string, resource: string, action: string): boolean
  getCommandMetadata(domain: string, resource: string, action: string): CommandMetadata
}

export interface CommandMetadata {
  domain: Domain
  resource: Resource
  action: string
  command: string
  description: string
  category: string
  compliance: string[]
  governance: string[]
}

// Enterprise Runner Types
export interface EnterpriseContext {
  domain?: string
  project?: string
  environment?: string
  region?: string
  compliance?: string
  user?: string
  role?: string
  workspace?: string
  timestamp: Date
}

export interface EnterpriseRunner {
  executeDomain(domain: string, resource: string, action: string, args?: string[], options?: any): Promise<CliExpectation>
  executeWithContext(command: string, context?: any): Promise<CliExpectation>
  executeBatch(commands: Command[]): Promise<BatchResult[]>
  executePipeline(pipeline: Pipeline): Promise<PipelineResult>
  setContext(context: EnterpriseContext): this
  getContext(): EnterpriseContext
  clearContext(): this
  getAuditLog(): AuditEntry[]
  clearAuditLog(): this
  getBatchResults(): BatchResult[]
  clearBatchResults(): this
}

export interface Command {
  command: string
  context?: any
}

export interface BatchResult {
  command: string
  success: boolean
  result?: CliExpectation
  error?: string
}

export interface Pipeline {
  name: string
  stages: PipelineStage[]
  failFast: boolean
  rollback: boolean
}

export interface PipelineStage {
  name: string
  command: string
  context: any
  updateContext?: (result: CliExpectation) => any
  rollback?: string
}

export interface PipelineResult {
  pipeline: string
  results: PipelineStageResult[]
  success: boolean
}

export interface PipelineStageResult {
  stage: string
  success: boolean
  result?: CliExpectation
  error?: string
}

export interface AuditEntry {
  timestamp: Date
  command: string
  context: any
  result: {
    exitCode: number
    duration: number
  }
}

// Enterprise Scenario Types
export interface EnterpriseScenarioBuilder {
  name: string
  domain: string | null
  steps: EnterpriseScenarioStep[]
  context: EnterpriseContext
  compliance: string[]
  audit: any[]
}

export interface EnterpriseScenarioStep {
  description: string
  command?: string
  action?: Function
  options?: any
  expectations?: (string | Expectation)[]
}

export interface Expectation {
  type: string
  match: string | RegExp
}

export interface EnterpriseScenarioResult {
  scenario: string
  domain: string | null
  results: EnterpriseScenarioStepResult[]
  success: boolean
  context: EnterpriseContext
  compliance: string[]
}

export interface EnterpriseScenarioStepResult {
  step: string
  success: boolean
  result?: CliExpectation
  error?: string
}

// Enterprise Assertions Types
export interface EnterpriseAssertions extends CliExpectation {
  expectResourceCreated(domain: string, resource: string, id: string): this
  expectResourceUpdated(domain: string, resource: string, id: string): this
  expectResourceDeleted(domain: string, resource: string, id: string): this
  expectResourceListed(domain: string, resource: string, expectedCount?: number): this
  expectResourceShown(domain: string, resource: string, id: string): this
  expectDomainOperation(domain: string, operation: string): this
  expectCrossDomainConsistency(domains: string[]): this
  expectComplianceValidated(standard: string): this
  expectPolicyEnforced(policy: string): this
  expectAuditLog(action: string, resource: string, user: string): this
  expectAuditTrail(operations: Operation[]): this
  expectResourceState(domain: string, resource: string, id: string, expectedState: string): this
  expectResourceAttributes(domain: string, resource: string, id: string, attributes: string[]): this
}

export interface Operation {
  action: string
  resource: string
  user: string
}

export interface ResourceValidator {
  registerValidator(domain: string, resource: string, validator: Function): this
  validateResource(domain: string, resource: string, data: any): any
  validateResourceState(domain: string, resource: string, id: string): any
  validateResourceRelationships(domain: string, resource: string, id: string): any
}

// Enterprise Test Utils Types
export interface EnterpriseTestUtils {
  createResource(domain: string, resource: string, data: any): Promise<ResourceInstance>
  listResources(domain: string, resource: string, filter?: any): Promise<ResourceList>
  getResource(domain: string, resource: string, id: string): Promise<ResourceInstance>
  updateResource(domain: string, resource: string, id: string, data: any): Promise<ResourceInstance>
  deleteResource(domain: string, resource: string, id: string): Promise<ResourceInstance>
  deployApplication(app: string, config: any): Promise<DeploymentResult>
  validateCompliance(standard: string, scope?: string): Promise<ComplianceResult>
  setContext(context: EnterpriseContext): this
  getContext(): EnterpriseContext
  clearContext(): this
  createWorkspace(name: string, config: any): Promise<Workspace>
  switchWorkspace(name: string): Promise<Workspace>
  listWorkspaces(): Promise<Workspace[]>
  deleteWorkspace(name: string): Promise<Workspace>
  cleanupWorkspaceResources(workspaceName: string): Promise<CleanupResult>
  getResourceReferences(): ResourceInstance[]
  getResourceReference(domain: string, resource: string, name: string): ResourceInstance | undefined
  cleanupAllResources(): Promise<CleanupResult>
}

export interface ResourceInstance {
  domain: string
  resource: string
  name: string
  data: any
  created: Date
  updated?: Date
}

export interface ResourceList {
  domain: string
  resource: string
  resources: any[]
  count: number
}

export interface DeploymentResult {
  app: string
  server: string
  environment: string
  region: string
  deployed: Date
}

export interface ComplianceResult {
  standard: string
  scope: string
  result: any
  validated: Date
}

export interface Workspace {
  name: string
  config: any
  created: Date
  context?: EnterpriseContext
}

export interface CleanupResult {
  cleanedUp: number
  resources: ResourceInstance[]
}

// Export functions and classes
export function command(domainName: string): CommandBuilder
export function createCommand(): CommandBuilder
export function createDomainRegistry(): DomainRegistry
export function createEnterpriseRunner(options?: any): EnterpriseRunner
export function createEnterpriseContext(): EnterpriseContext
export function createPipeline(name: string): PipelineBuilder
export function createEnterpriseScenario(name: string, domain?: string): EnterpriseScenarioBuilder
export function createEnterpriseAssertions(result: CliResult): EnterpriseAssertions
export function createResourceValidator(): ResourceValidator
export function createEnterpriseTestUtils(options?: any): EnterpriseTestUtils

// Export domain-specific builders
export const infra: {
  server: () => CommandBuilder
  network: () => CommandBuilder
  storage: () => CommandBuilder
  database: () => CommandBuilder
}

export const dev: {
  project: () => CommandBuilder
  app: () => CommandBuilder
  test: () => CommandBuilder
  scenario: () => CommandBuilder
  snapshot: () => CommandBuilder
}

export const security: {
  user: () => CommandBuilder
  role: () => CommandBuilder
  policy: () => CommandBuilder
  secret: () => CommandBuilder
  certificate: () => CommandBuilder
}

// Export enterprise scenarios
export const enterpriseScenarios: {
  infra: {
    server: {
      create: (options?: any) => EnterpriseScenarioBuilder
      lifecycle: (options?: any) => EnterpriseScenarioBuilder
      disasterRecovery: (options?: any) => EnterpriseScenarioBuilder
    }
    network: {
      create: (options?: any) => EnterpriseScenarioBuilder
    }
  }
  dev: {
    project: {
      create: (options?: any) => EnterpriseScenarioBuilder
      deploy: (options?: any) => EnterpriseScenarioBuilder
      ciCd: (options?: any) => EnterpriseScenarioBuilder
    }
    test: {
      run: (options?: any) => EnterpriseScenarioBuilder
      regression: (options?: any) => EnterpriseScenarioBuilder
      performance: (options?: any) => EnterpriseScenarioBuilder
    }
  }
  security: {
    user: {
      audit: (options?: any) => EnterpriseScenarioBuilder
      lifecycle: (options?: any) => EnterpriseScenarioBuilder
    }
    policy: {
      validate: (options?: any) => EnterpriseScenarioBuilder
    }
  }
  crossDomain: {
    deployment: (options?: any) => EnterpriseScenarioBuilder
    compliance: (options?: any) => EnterpriseScenarioBuilder
    disasterRecovery: (options?: any) => EnterpriseScenarioBuilder
  }
}
