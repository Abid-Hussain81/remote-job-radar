import type { NormalizedJob, JobSource } from '@/types/job';

export interface FetchOptions {
  limit?: number;
  tags?: string[];
  maxPages?: number;
  [key: string]: unknown;
}

export interface SourceAdapter {
  id: JobSource;
  fetchJobs(opts?: FetchOptions): Promise<NormalizedJob[]>;
}

export interface SourceRunResult {
  source: string;
  ok: boolean;
  count: number;
  error?: string;
  ms: number;
}
