/**
 * @fileoverview useRemotes hook
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

import type { RemoteInfo } from '../types.js';
import { gitOrNull } from '../execution/index.js';

export function useRemotes(): () => AsyncHookResult<readonly RemoteInfo[]> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<readonly RemoteInfo[]>>({
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

    async function fetchRemotes() {
      try {
        const output = await gitOrNull(['remote', '-v'], cwd);

        if (cancelled) return;

        const remotes: Map<string, Partial<RemoteInfo>> = new Map();

        if (output) {
          for (const line of output.split('\n').filter(Boolean)) {
            const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
            if (match) {
              const [, name, url, type] = match;
              if (!name || !url) continue;

              const existing = remotes.get(name) ?? { name, isOrigin: name === 'origin' };

              if (type === 'fetch') {
                existing.fetchUrl = url;
              } else {
                existing.pushUrl = url;
              }

              remotes.set(name, existing);
            }
          }
        }

        const remoteInfos: RemoteInfo[] = Array.from(remotes.values())
          .filter((r): r is RemoteInfo =>
            typeof r.name === 'string' &&
            typeof r.fetchUrl === 'string' &&
            typeof r.pushUrl === 'string' &&
            typeof r.isOrigin === 'boolean'
          );

        setResult({
          data: remoteInfos,
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

    fetchRemotes();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}
