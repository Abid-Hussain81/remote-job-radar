import type { NormalizedJob } from '@/types/job';
import type { SourceAdapter, FetchOptions } from './types';
import { fetchJson } from './http';
import { htmlToText, toDate } from './clean';

export const JOBICY_DEFAULT_TAGS = [
  'react',
  'nextjs',
  'javascript',
  'node',
  'typescript',
  'frontend',
  'fullstack',
];

const JOBICY_BASE_URL = 'https://jobicy.com/api/v2/remote-jobs';

export interface JobicyRawJob {
  id?: number | string;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string[] | string;
  jobType?: string[] | string;
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  [key: string]: unknown;
}

export interface JobicyApiResponse {
  jobs?: JobicyRawJob[];
  hasMore?: boolean;
  nextCursor?: string;
  [key: string]: unknown;
}

/**
 * Pure normalization function for Jobicy raw job items.
 */
export function normalizeJobicy(rawJobs: unknown[]): NormalizedJob[] {
  if (!Array.isArray(rawJobs)) return [];

  const normalized: NormalizedJob[] = [];
  const now = new Date();

  for (const item of rawJobs) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as JobicyRawJob;

    if (raw.id === undefined || raw.id === null) continue;

    const externalId = String(raw.id).trim();
    const title = (raw.jobTitle || '').trim();
    const company = (raw.companyName || '').trim();
    const url = (raw.url || '').trim();

    if (!externalId || !title || !company || !url) {
      continue;
    }

    const postedDate = toDate(raw.pubDate);
    if (!postedDate) {
      continue;
    }

    const geo = (raw.jobGeo || '').trim();
    let isWorldwide: boolean | null = null;
    let eligibleCountries: string[] = [];

    if (!geo) {
      isWorldwide = null;
      eligibleCountries = [];
    } else if (geo.toLowerCase() === 'anywhere') {
      isWorldwide = true;
      eligibleCountries = [];
    } else {
      isWorldwide = false;
      eligibleCountries = [geo];
    }

    // Employment type
    let employmentType: string | null = null;
    if (Array.isArray(raw.jobType)) {
      employmentType = raw.jobType.join(', ').trim() || null;
    } else if (typeof raw.jobType === 'string') {
      employmentType = raw.jobType.trim() || null;
    }

    // Tags from jobIndustry
    const tags: string[] = [];
    if (Array.isArray(raw.jobIndustry)) {
      for (const ind of raw.jobIndustry) {
        if (ind) tags.push(String(ind).trim());
      }
    } else if (typeof raw.jobIndustry === 'string') {
      tags.push(raw.jobIndustry.trim());
    }

    // Salary handling
    const sMin =
      typeof raw.salaryMin === 'number' && raw.salaryMin > 0
        ? raw.salaryMin
        : null;
    const sMax =
      typeof raw.salaryMax === 'number' && raw.salaryMax > 0
        ? raw.salaryMax
        : null;
    const currency = sMin || sMax ? raw.salaryCurrency || null : null;

    normalized.push({
      id: `jobicy:${externalId}`,
      source: 'jobicy',
      title,
      company,
      url,
      description: htmlToText(raw.jobDescription || raw.jobExcerpt),
      tags,
      locationText: geo,
      isWorldwide,
      eligibleCountries,
      seniority: raw.jobLevel ? String(raw.jobLevel).trim() : null,
      employmentType,
      salaryMin: sMin,
      salaryMax: sMax,
      currency,
      postedAt: postedDate,
      expiresAt: null,
      fetchedAt: now,
    });
  }

  return normalized;
}

export const jobicyAdapter: SourceAdapter = {
  id: 'jobicy',
  async fetchJobs(opts?: FetchOptions): Promise<NormalizedJob[]> {
    const tags = opts?.tags ?? JOBICY_DEFAULT_TAGS;
    const seenIds = new Set<string>();
    const allJobs: NormalizedJob[] = [];

    for (const tag of tags) {
      try {
        const url = `${JOBICY_BASE_URL}?count=50&tag=${encodeURIComponent(tag)}`;
        const response = await fetchJson<JobicyApiResponse>(url);
        const jobs = normalizeJobicy(response?.jobs || []);

        for (const job of jobs) {
          if (!seenIds.has(job.id)) {
            seenIds.add(job.id);
            allJobs.push(job);
          }
        }
      } catch (err) {
        console.warn(`[Jobicy] Failed to fetch tag "${tag}":`, err);
      }
    }

    return allJobs;
  },
};

export default jobicyAdapter;
