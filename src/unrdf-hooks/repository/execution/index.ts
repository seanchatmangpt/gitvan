/**
 * @fileoverview Git command execution utilities
 *
 * Provides low-level git command execution for repository operations.
 *
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ============================================================================
// Git Command Execution
// ============================================================================

/**
 * Execute a git command and return output
 */
export async function git(
  args: readonly string[],
  cwd: string,
): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd,
    env: { ...process.env, TZ: 'UTC', LANG: 'C' },
    maxBuffer: 12 * 1024 * 1024,
  });
  return stdout.trim();
}

/**
 * Execute git command, returning null on error
 */
export async function gitOrNull(
  args: readonly string[],
  cwd: string,
): Promise<string | null> {
  try {
    return await git(args, cwd);
  } catch {
    return null;
  }
}
