/**
 * @fileoverview useStashes hook
 * @version 4.0.0
 * @author GitVan Team
 * @license Apache-2.0
 */

import {
  useState,
  useEffect,
  tryUseHookContext,
  type AsyncHookResult,
} from '../../core/index.js';

import type { StashEntry } from '../types.js';
import { gitOrNull } from '../execution/index.js';

export function useStashes(): () => AsyncHookResult<readonly StashEntry[]> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<readonly StashEntry[]>>({
    data: null,
    error: null,
    loading: true,
    executed: false,
    duration: 0,
    attempts: 0,
    cached: false,
  });

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    async function fetchStashes() {
      try {
        const format = '%H%n%gd%n%gs%n%aI';
        const output = await gitOrNull(['stash', 'list', `--format=${format}`], cwd);

        if (cancelled) return;

        const stashes: StashEntry[] = [];

        if (output) {
          const lines = output.split('\n');
          for (let i = 0; i < lines.length; i += 4) {
            const sha = lines[i];
            const reflog = lines[i + 1];
            const message = lines[i + 2];
            const timestamp = lines[i + 3];

            if (sha && reflog && message && timestamp) {
              const indexMatch = reflog.match(/stash@\{(\d+)\}/);
              const index = indexMatch ? parseInt(indexMatch[1] ?? '0', 10) : stashes.length;

              const branchMatch = message.match(/^WIP on (\S+):/);
              const branch = branchMatch?.[1];

              stashes.push({
                index,
                sha,
                message,
                timestamp: new Date(timestamp),
                branch,
              });
            }
          }
        }

        setResult({
          data: stashes,
          error: null,
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      } catch (error) {
        if (cancelled) return;

        setResult({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
          executed: true,
          duration: Date.now() - startTime,
          attempts: 1,
          cached: false,
        });
      }
    }

    fetchStashes();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}
