/**
 * @fileoverview useTags hook
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

import type { TagInfo } from '../types.js';
import { gitOrNull } from '../execution/index.js';

export function useTags(): () => AsyncHookResult<readonly TagInfo[]> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<readonly TagInfo[]>>({
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

    async function fetchTags() {
      try {
        const output = await gitOrNull(
          ['tag', '-l', '--format=%(refname:short)%09%(objecttype)%09%(*objectname)%09%(objectname)'],
          cwd,
        );

        if (cancelled) return;

        const tags: TagInfo[] = [];

        if (output) {
          for (const line of output.split('\n').filter(Boolean)) {
            const [name, objectType, deref, objectName] = line.split('\t');
            if (!name || !objectName) continue;

            const isAnnotated = objectType === 'tag';
            const targetSha = isAnnotated && deref ? deref : objectName;

            tags.push({
              name,
              type: isAnnotated ? 'annotated' : 'lightweight',
              targetSha,
              tagSha: isAnnotated ? objectName : undefined,
            });
          }
        }

        setResult({
          data: tags,
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

    fetchTags();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}
