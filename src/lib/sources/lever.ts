import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import type { NormalizedJob } from '@/types/job';
import type { SourceAdapter, FetchOptions, CompanyRunDetail } from './types';
import { fetchJson } from './http';
import { htmlToText, toDate } from './clean';
import { getCompanies, type CompanyConfig } from './companies';

countries.registerLocale(enLocale);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface LeverCategories {
  commitment?: string;
  department?: string;
  location?: string;
  team?: string;
  allLocations?: string[];
  [key: string]: unknown;
}

export interface LeverList {
  text?: string;
  content?: string;
  [key: string]: unknown;
}

export interface LeverRawPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number | string;
  categories?: LeverCategories;
  workplaceType?: string;
  country?: string;
  descriptionPlain?: string;
  description?: string;
  lists?: LeverList[];
  additionalPlain?: string;
  [key: string]: unknown;
}

/**
 * Pure normalization function for Lever raw postings.
 */
export function normalizeLeverPostings(
  rawPostings: unknown[],
  token: string,
  fallbackCompanyName: string = token,
  remoteOnly: boolean = true
): { jobs: NormalizedJob[]; totalJobs: number; remoteKept: number } {
  if (!Array.isArray(rawPostings)) {
    return { jobs: [], totalJobs: 0, remoteKept: 0 };
  }

  const normalized: NormalizedJob[] = [];
  const now = new Date();
  let totalJobs = 0;
  let remoteKept = 0;

  for (const item of rawPostings) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as LeverRawPosting;

    if (!raw.id) continue;
    totalJobs++;

    const externalId = `${token}-${raw.id}`;
    const title = (raw.text || '').trim();
    const url = (raw.hostedUrl || raw.applyUrl || '').trim();
    const company = fallbackCompanyName;

    if (!title || !url || !company) {
      continue;
    }

    const categories = raw.categories || {};
    const workplaceType = (raw.workplaceType || '').toLowerCase();
    const locationText = (categories.location || '').trim();
    const allLocations = Array.isArray(categories.allLocations)
      ? categories.allLocations
      : [];

    // Remote detection: workplaceType === 'remote' OR /remote/i in location/allLocations. Hybrid/office-only -> false
    const isHybridOrOnsite =
      workplaceType === 'hybrid' ||
      workplaceType === 'onsite' ||
      /hybrid/i.test(locationText);
    const isWorkplaceRemote = workplaceType === 'remote';
    const isLocationRemote = /remote/i.test(locationText);
    const hasRemoteInAllLocations = allLocations.some((loc) =>
      /remote/i.test(loc)
    );
    const isRemote =
      !isHybridOrOnsite &&
      (isWorkplaceRemote || isLocationRemote || hasRemoteInAllLocations);

    if (isRemote) {
      remoteKept++;
    }

    if (remoteOnly && !isRemote) {
      continue;
    }

    // Eligible countries from ISO-2 code
    let eligibleCountries: string[] = [];
    let isWorldwide: boolean | null = null;

    if (raw.country) {
      const countryCode = String(raw.country).trim().toUpperCase();
      const countryName = countries.getName(countryCode, 'en') || countryCode;
      eligibleCountries = [countryName];
      isWorldwide = false;
    } else {
      isWorldwide = null;
      eligibleCountries = [];
    }

    // Description compilation
    let descBody = '';
    if (raw.descriptionPlain && raw.descriptionPlain.trim()) {
      descBody = raw.descriptionPlain.trim();
    } else if (raw.description) {
      descBody = htmlToText(raw.description);
    }

    const listsTextParts: string[] = [];
    if (Array.isArray(raw.lists)) {
      for (const list of raw.lists) {
        if (!list) continue;
        const listHeader = (list.text || '').trim();
        const listContent = list.content ? htmlToText(list.content) : '';
        if (listHeader || listContent) {
          listsTextParts.push(
            `${listHeader ? `${listHeader}\n` : ''}${listContent}`
          );
        }
      }
    }

    if (listsTextParts.length > 0) {
      descBody += `\n\n${listsTextParts.join('\n\n')}`;
    }

    if (raw.additionalPlain && raw.additionalPlain.trim()) {
      descBody += `\n\n${raw.additionalPlain.trim()}`;
    }

    const description = htmlToText(descBody);

    // Tags
    const tags: string[] = [];
    if (categories.department) tags.push(categories.department.trim());
    if (categories.team && !tags.includes(categories.team.trim())) {
      tags.push(categories.team.trim());
    }

    const postedAt = toDate(raw.createdAt) || now;

    normalized.push({
      id: `lever:${externalId}`,
      source: 'lever',
      title,
      company,
      url,
      description,
      tags,
      locationText: locationText || (isRemote ? 'Remote' : ''),
      isWorldwide,
      eligibleCountries,
      isRemote,
      trust: 'direct',
      companyBoard: {
        platform: 'lever',
        token,
      },
      seniority: null,
      employmentType: categories.commitment ? categories.commitment.trim() : null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      postedAt,
      expiresAt: null,
      fetchedAt: now,
    });
  }

  return { jobs: normalized, totalJobs, remoteKept };
}

let lastRunDetails: CompanyRunDetail[] = [];

export const leverAdapter: SourceAdapter = {
  id: 'lever',
  getLastRunDetails() {
    return lastRunDetails;
  },
  async fetchJobs(opts?: FetchOptions): Promise<NormalizedJob[]> {
    const remoteOnly = opts?.remoteOnly ?? true;
    const companies: CompanyConfig[] =
      (opts?.companies as CompanyConfig[]) ?? getCompanies('lever');

    const allJobs: NormalizedJob[] = [];
    const details: CompanyRunDetail[] = [];

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      if (i > 0) await sleep(250);

      try {
        let rawData: unknown[] | null = null;
        const globalUrl = `https://api.lever.co/v0/postings/${encodeURIComponent(
          company.token
        )}?mode=json`;

        try {
          rawData = await fetchJson<unknown[]>(globalUrl);
        } catch (fetchErr: unknown) {
          const errString = String(fetchErr);
          // If 404, retry once on EU host
          if (errString.includes('404')) {
            const euUrl = `https://api.eu.lever.co/v0/postings/${encodeURIComponent(
              company.token
            )}?mode=json`;
            rawData = await fetchJson<unknown[]>(euUrl);
          } else {
            throw fetchErr;
          }
        }

        const { jobs, totalJobs, remoteKept } = normalizeLeverPostings(
          rawData || [],
          company.token,
          company.name,
          remoteOnly
        );

        allJobs.push(...jobs);
        details.push({
          company: company.name,
          ok: true,
          total: totalJobs,
          remoteKept,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[Lever] Failed for ${company.name} (${company.token}): ${message}`);
        details.push({
          company: company.name,
          ok: false,
          total: 0,
          remoteKept: 0,
          error: message,
        });
      }
    }

    lastRunDetails = details;
    return allJobs;
  },
};

export default leverAdapter;
