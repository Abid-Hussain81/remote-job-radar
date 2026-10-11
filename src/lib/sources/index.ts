import type { NormalizedJob } from '@/types/job';
import type { SourceAdapter, SourceRunResult, FetchOptions } from './types';
import { remoteOkAdapter } from './remoteok';
import { wwrAdapter } from './wwr';
import { jobicyAdapter } from './jobicy';
import { himalayasAdapter } from './himalayas';
import { greenhouseAdapter } from './greenhouse';
import { leverAdapter } from './lever';
import { ashbyAdapter } from './ashby';

export * from './types';
export * from './meta';
export * from './http';
export * from './clean';
export * from './companies';
export * from './detect-board';
export { remoteOkAdapter, normalizeRemoteOk } from './remoteok';
export { wwrAdapter, normalizeWwrItems, normalizeWwrXml } from './wwr';
export { jobicyAdapter, normalizeJobicy } from './jobicy';
export { himalayasAdapter, normalizeHimalayas } from './himalayas';
export { greenhouseAdapter, normalizeGreenhouseJobs } from './greenhouse';
export { leverAdapter, normalizeLeverPostings } from './lever';
export { ashbyAdapter, normalizeAshbyJobs } from './ashby';

/**
 * Pluggable registry of all active source adapters.
 * To register a new source, add its adapter file and add an entry here.
 */
export const ADAPTERS: SourceAdapter[] = [
  remoteOkAdapter,
  wwrAdapter,
  jobicyAdapter,
  himalayasAdapter,
  greenhouseAdapter,
  leverAdapter,
  ashbyAdapter,
];

export interface RunAllSourcesResult {
  jobs: NormalizedJob[];
  results: SourceRunResult[];
}

/**
 * Runs all registered adapters concurrently using Promise.allSettled.
 * A failure in any single adapter is safely captured and never aborts other adapters.
 */
export async function runAllSources(
  opts?: FetchOptions,
  adapters: SourceAdapter[] = ADAPTERS
): Promise<RunAllSourcesResult> {
  const settled = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const start = Date.now();
      try {
        const jobs = await adapter.fetchJobs(opts);
        const ms = Date.now() - start;
        const result: SourceRunResult = {
          source: adapter.id,
          ok: true,
          count: jobs.length,
          ms,
          details: adapter.getLastRunDetails
            ? adapter.getLastRunDetails()
            : undefined,
        };
        return { jobs, result };
      } catch (err) {
        const ms = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        const result: SourceRunResult = {
          source: adapter.id,
          ok: false,
          count: 0,
          error: message,
          ms,
          details: adapter.getLastRunDetails
            ? adapter.getLastRunDetails()
            : undefined,
        };
        return { jobs: [], result };
      }
    })
  );

  const allJobs: NormalizedJob[] = [];
  const results: SourceRunResult[] = [];

  for (const item of settled) {
    if (item.status === 'fulfilled') {
      allJobs.push(...item.value.jobs);
      results.push(item.value.result);
    } else {
      results.push({
        source: 'unknown',
        ok: false,
        count: 0,
        error: String(item.reason),
        ms: 0,
      });
    }
  }

  return { jobs: allJobs, results };
}
