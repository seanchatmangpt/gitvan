/**
 * @fileoverview useHeadInfo hook
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

import type { HeadInfo } from '../types.js';
import { git } from '../execution/index.js';

export function useHeadInfo(): () => AsyncHookResult<HeadInfo> {
  const ctx = tryUseHookContext();
  const cwd = ctx?.cwd ?? process.cwd();

  const [result, setResult] = useState<AsyncHookResult<HeadInfo>>({
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

    async function fetchHead() {
      try {
        const format = '%H%n%h%n%s%n%an%n%ae%n%aI';
        const output = await git(['log', '-1', `--format=${format}`], cwd);

        if (cancelled) return;

        const [sha, shortSha, subject, authorName, authorEmail, timestamp] =
          output.split('\n');

        if (!sha || !shortSha || !subject || !authorName || !authorEmail || !timestamp) {
          throw new Error('Invalid commit format');
        }

        const info: HeadInfo = {
          sha,
          shortSha,
          subject,
          author: {
            name: authorName,
            email: authorEmail,
          },
          timestamp: new Date(timestamp),
        };

        setResult({
          data: info,
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

    fetchHead();

    return () => {
      cancelled = true;
    };
  }, [cwd]);

  return result;
}
