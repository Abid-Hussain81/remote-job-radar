import type { NormalizedJob } from '@/types/job';
import type { SourceAdapter } from './types';
import { fetchJson } from './http';
import { htmlToText, toDate } from './clean';

const REMOTEOK_API_URL = 'https://remoteok.com/api';

export interface RemoteOkRawJob {
  id?: string | number;
  slug?: string;
  epoch?: number | string;
  date?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  apply_url?: string;
  url?: string;
  [key: string]: unknown;
}

/**
 * Pure normalization function for RemoteOK feed items.
 */
export function normalizeRemoteOk(rawItems: unknown[]): NormalizedJob[] {
  if (!Array.isArray(rawItems)) return [];

  const normalized: NormalizedJob[] = [];
  const now = new Date();

  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as RemoteOkRawJob;

    // Element 0 is a legal notice object without an id; skip any item missing id
    if (!raw.id) continue;

    const externalId = String(raw.id).trim();
    const title = (raw.position || '').trim();
    const company = (raw.company || '').trim();
    const url = (raw.url || raw.apply_url || '').trim();

    // Required field validation
    if (!externalId || !title || !company || !url) {
      continue;
    }

    const postedDate = toDate(raw.date) || toDate(raw.epoch);
    if (!postedDate) {
      continue;
    }

    const locationRaw = (raw.location || '').trim();
    let isWorldwide: boolean | null = null;
    let eligibleCountries: string[] = [];

    if (!locationRaw) {
      isWorldwide = null;
      eligibleCountries = [];
    } else {
      const lowerLoc = locationRaw.toLowerCase();
      if (lowerLoc === 'worldwide' || lowerLoc === 'anywhere') {
        isWorldwide = true;
        eligibleCountries = [];
      } else {
        isWorldwide = false;
        eligibleCountries = [];
      }
    }

    const salaryMin =
      typeof raw.salary_min === 'number' && raw.salary_min > 0
        ? raw.salary_min
        : null;
    const salaryMax =
      typeof raw.salary_max === 'number' && raw.salary_max > 0
        ? raw.salary_max
        : null;
    const currency = salaryMin || salaryMax ? 'USD' : null;

    normalized.push({
      id: `remoteok:${externalId}`,
      source: 'remoteok',
      title,
      company,
      url,
      description: htmlToText(raw.description),
      tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).trim()) : [],
      locationText: locationRaw,
      isWorldwide,
      eligibleCountries,
      seniority: null,
      employmentType: null,
      salaryMin,
      salaryMax,
      currency,
      postedAt: postedDate,
      expiresAt: null,
      fetchedAt: now,
    });
  }

  return normalized;
}

export const remoteOkAdapter: SourceAdapter = {
  id: 'remoteok',
  async fetchJobs(): Promise<NormalizedJob[]> {
    const rawData = await fetchJson<unknown[]>(REMOTEOK_API_URL);
    return normalizeRemoteOk(rawData);
  },
};

export default remoteOkAdapter;
