export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  json?: unknown;
  cwd: string;
  args: string[];
  duration?: number;
}

export interface CliExpectation {
  expectExit(code: number): this;
  expectOutput(match: string | RegExp): this;
  expectStderr(match: string | RegExp): this;
  expectJson<T = any>(matcher?: (json: T) => void): this;
  expectSuccess(): this;
  expectFailure(): this;
  expectNoOutput(): this;
  expectNoStderr(): this;
  expectOutputLength(minLength: number, maxLength?: number): this;
  expectStderrLength(minLength: number, maxLength?: number): this;
  expectExitCodeIn(codes: number[]): this;
  expectOutputContains(text: string): this;
  expectStderrContains(text: string): this;
  expectOutputNotContains(text: string): this;
  expectStderrNotContains(text: string): this;
  expectDuration(maxDuration: number): this;
  result: CliResult;
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  json?: boolean;
  timeout?: number;
}

export interface Cleanroom {
  runCitty(args: string[], opts?: RunOptions): Promise<CliExpectation>;
  stop(): Promise<void>;
}

export interface CleanroomStatic {
  setup(options?: { rootDir?: string; nodeImage?: string }): Promise<Cleanroom>;
  teardown(): Promise<void>;
}

export const CittyCleanroom: CleanroomStatic;

export function runLocalCitty(
  args: string[],
  opts?: RunOptions
): Promise<CliResult>;

// Scenario DSL types
export interface ScenarioStep {
  description: string;
  command: {
    args: string[];
    options: RunOptions;
  } | null;
  expectations: Array<(result: CliExpectation) => void>;
}

export interface ScenarioResult {
  scenario: string;
  results: Array<{
    step: string;
    success: boolean;
    result?: CliExpectation;
    error?: string;
  }>;
  success: boolean;
  lastResult?: CliExpectation;
}

export interface ScenarioBuilder {
  step(description: string): this;
  run(args: string[], options?: RunOptions): this;
  expect(expectationFn: (result: CliExpectation) => void): this;
  execute(runner?: "local" | "cleanroom"): Promise<ScenarioResult>;

  // Convenience methods
  expectSuccess(): this;
  expectFailure(): this;
  expectExit(code: number): this;
  expectOutput(match: string | RegExp): this;
  expectStderr(match: string | RegExp): this;
  expectNoOutput(): this;
  expectNoStderr(): this;
  expectJson(validator?: (json: any) => void): this;
}

export function scenario(name: string): ScenarioBuilder;
export function cleanroomScenario(name: string): ScenarioBuilder;
export function localScenario(name: string): ScenarioBuilder;

export const scenarios: {
  help: (options?: RunOptions) => ScenarioBuilder;
  version: (options?: RunOptions) => ScenarioBuilder;
  invalidCommand: (options?: RunOptions) => ScenarioBuilder;
  initProject: (projectName?: string, options?: RunOptions) => ScenarioBuilder;
  buildAndTest: (options?: RunOptions) => ScenarioBuilder;
  cleanroomInit: (projectName?: string) => ScenarioBuilder;
  localDev: (options?: RunOptions) => ScenarioBuilder;
};

export const testUtils: {
  waitFor: (
    conditionFn: () => Promise<boolean>,
    timeout?: number,
    interval?: number
  ) => Promise<boolean>;
  retry: <T>(
    runnerFn: () => Promise<T>,
    maxAttempts?: number,
    delay?: number
  ) => Promise<T>;
  createTempFile: (content: string, extension?: string) => Promise<string>;
  cleanupTempFiles: (files: string[]) => Promise<void>;
};
