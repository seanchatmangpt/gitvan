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
