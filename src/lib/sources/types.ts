import type { NormalizedJob, JobSource } from '@/types/job';

export interface CompanyRunDetail {
  company: string;
  ok: boolean;
  total: number;
  remoteKept: number;
  error?: string;
}

export interface FetchOptions {
  limit?: number;
  tags?: string[];
  maxPages?: number;
  remoteOnly?: boolean;
  companies?: Array<{ name: string; platform: string; token: string }>;
  [key: string]: unknown;
}

export interface SourceAdapter {
  id: JobSource;
  fetchJobs(opts?: FetchOptions): Promise<NormalizedJob[]>;
  getLastRunDetails?: () => CompanyRunDetail[];
}

export interface SourceRunResult {
  source: string;
  ok: boolean;
  count: number;
  error?: string;
  ms: number;
  details?: CompanyRunDetail[];
}
