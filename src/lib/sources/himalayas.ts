import type { NormalizedJob } from '@/types/job';
import type { SourceAdapter, FetchOptions } from './types';
import { fetchJson } from './http';
import { htmlToText, toDate } from './clean';

const HIMALAYAS_API_BASE = 'https://himalayas.app/jobs/api';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_PAGES = 5;

export interface HimalayasRawJob {
  title?: string;
  excerpt?: string;
  companyName?: string;
  companySlug?: string;
  employmentType?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  salaryPeriod?: string;
  seniority?: string[];
  locationRestrictions?: string[];
  timezoneRestrictions?: string[];
  categories?: string[];
  parentCategories?: string[];
  description?: string;
  pubDate?: number; // UNIX SECONDS
  expiryDate?: number; // UNIX SECONDS
  applicationLink?: string;
  guid?: string;
  [key: string]: unknown;
}

export interface HimalayasApiResponse {
  jobs?: HimalayasRawJob[];
  nextCursor?: string | null;
  totalCount?: number;
  [key: string]: unknown;
}

export interface HimalayasNormalizeResult {
  jobs: NormalizedJob[];
  reachedStaleCutoff: boolean;
}

/**
 * Pure normalization function for Himalayas raw job items.
 * Drops expired jobs and flags if any job exceeds the 30-day cutoff.
 */
export function normalizeHimalayas(
  rawJobs: unknown[],
  referenceNow: Date = new Date()
): HimalayasNormalizeResult {
  if (!Array.isArray(rawJobs)) {
    return { jobs: [], reachedStaleCutoff: false };
  }

  const normalized: NormalizedJob[] = [];
  const cutoffTime = referenceNow.getTime() - THIRTY_DAYS_MS;
  let reachedStaleCutoff = false;

  for (const item of rawJobs) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as HimalayasRawJob;

    const guid = (raw.guid || '').trim();
    const title = (raw.title || '').trim();
    const company = (raw.companyName || '').trim();
    const url = (raw.applicationLink || raw.guid || '').trim();

    if (!guid || !title || !company || !url) {
      continue;
    }

    const postedDate = toDate(raw.pubDate);
    if (!postedDate) {
      continue;
    }

    // Check if job is older than 30 days
    if (postedDate.getTime() < cutoffTime) {
      reachedStaleCutoff = true;
      continue;
    }

    // Check if job is expired
    const expiryDate = toDate(raw.expiryDate);
    if (expiryDate && expiryDate.getTime() < referenceNow.getTime()) {
      continue;
    }

    // Location / Worldwide handling
    const locationRestrictions = Array.isArray(raw.locationRestrictions)
      ? raw.locationRestrictions.map((l) => String(l).trim()).filter(Boolean)
      : [];

    const isWorldwide = locationRestrictions.length === 0;
    const eligibleCountries = isWorldwide ? [] : locationRestrictions;
    const locationText = isWorldwide
      ? 'Worldwide'
      : eligibleCountries.join(', ');

    // Seniority & tags
    const seniority =
      Array.isArray(raw.seniority) && raw.seniority.length > 0
        ? String(raw.seniority[0]).trim()
        : null;

    const tags = Array.isArray(raw.categories)
      ? raw.categories.map((c) => String(c).trim()).filter(Boolean)
      : [];

    // Salary handling
    const sMin =
      typeof raw.minSalary === 'number' && raw.minSalary > 0
        ? raw.minSalary
        : null;
    const sMax =
      typeof raw.maxSalary === 'number' && raw.maxSalary > 0
        ? raw.maxSalary
        : null;
    const currency = sMin || sMax ? raw.currency || null : null;

    normalized.push({
      id: `himalayas:${guid}`,
      source: 'himalayas',
      title,
      company,
      url,
      description: htmlToText(raw.description || raw.excerpt),
      tags,
      locationText,
      isWorldwide,
      eligibleCountries,
      isRemote: true,
      trust: 'aggregator',
      companyBoard: null,
      seniority,
      employmentType: raw.employmentType ? String(raw.employmentType).trim() : null,
      salaryMin: sMin,
      salaryMax: sMax,
      currency,
      postedAt: postedDate,
      expiresAt: expiryDate,
      fetchedAt: referenceNow,
    });
  }

  return { jobs: normalized, reachedStaleCutoff };
}

export const himalayasAdapter: SourceAdapter = {
  id: 'himalayas',
  async fetchJobs(opts?: FetchOptions): Promise<NormalizedJob[]> {
    const maxPages = opts?.maxPages ?? DEFAULT_MAX_PAGES;
    const limit = opts?.limit ?? 20;
    const seenIds = new Set<string>();
    const allJobs: NormalizedJob[] = [];
    let cursor: string | null = null;
    const now = new Date();

    for (let page = 0; page < maxPages; page++) {
      try {
        let url = `${HIMALAYAS_API_BASE}?limit=${limit}`;
        if (cursor) {
          url += `&cursor=${encodeURIComponent(cursor)}`;
        }

        const data = await fetchJson<HimalayasApiResponse>(url);
        const { jobs, reachedStaleCutoff } = normalizeHimalayas(
          data?.jobs || [],
          now
        );

        for (const job of jobs) {
          if (!seenIds.has(job.id)) {
            seenIds.add(job.id);
            allJobs.push(job);
          }
        }

        // Stop early if stale cutoff reached or no next cursor
        if (reachedStaleCutoff || !data?.nextCursor) {
          break;
        }

        cursor = data.nextCursor;
      } catch (err) {
        console.warn(`[Himalayas] Failed fetching page ${page + 1}:`, err);
        break;
      }
    }

    return allJobs;
  },
};

export default himalayasAdapter;
