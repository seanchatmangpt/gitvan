export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  json?: unknown;
  cwd: string;
  args: string[];
}

export interface CliExpectation {
  expectExit(code: number): this;
  expectOutput(match: string | RegExp): this;
  expectStderr(match: string | RegExp): this;
  expectJson<T = any>(matcher?: (json: T) => void): this;
  result: CliResult;
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  json?: boolean;
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
