import type { NormalizedJob } from '@/types/job';
import type { SourceAdapter, FetchOptions, CompanyRunDetail } from './types';
import { fetchJson } from './http';
import { htmlToText, toDate } from './clean';
import { getCompanies, type CompanyConfig } from './companies';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AshbyAddress {
  postalAddress?: {
    addressCountry?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AshbySecondaryLocation {
  location?: string;
  address?: AshbyAddress;
  [key: string]: unknown;
}

export interface AshbyCompensationComponent {
  compensationType?: string;
  minValue?: number;
  maxValue?: number;
  currencyCode?: string;
  [key: string]: unknown;
}

export interface AshbyRawJob {
  id?: string;
  title?: string;
  department?: string;
  team?: string;
  employmentType?: string;
  location?: string;
  secondaryLocations?: AshbySecondaryLocation[];
  publishedAt?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  address?: AshbyAddress;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensation?: {
    summaryComponents?: AshbyCompensationComponent[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AshbyApiResponse {
  jobs?: AshbyRawJob[];
  [key: string]: unknown;
}

/**
 * Pure normalization function for Ashby raw job items.
 */
export function normalizeAshbyJobs(
  rawJobs: unknown[],
  token: string,
  fallbackCompanyName: string = token,
  remoteOnly: boolean = true
): { jobs: NormalizedJob[]; totalJobs: number; remoteKept: number } {
  if (!Array.isArray(rawJobs)) {
    return { jobs: [], totalJobs: 0, remoteKept: 0 };
  }

  const normalized: NormalizedJob[] = [];
  const now = new Date();
  let totalJobs = 0;
  let remoteKept = 0;

  for (const item of rawJobs) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as AshbyRawJob;

    if (!raw.id) continue;

    // Skip unlisted positions
    if (raw.isListed === false) {
      continue;
    }
    totalJobs++;

    const externalId = `${token}-${raw.id}`;
    const title = (raw.title || '').trim();
    const url = (raw.jobUrl || raw.applyUrl || '').trim();
    const company = fallbackCompanyName;

    if (!title || !url || !company) {
      continue;
    }

    // Remote detection: Hybrid/onsite -> false
    const workplace = raw.workplaceType?.toLowerCase();
    const isHybridOrOnsite =
      workplace === 'hybrid' ||
      workplace === 'onsite' ||
      /hybrid/i.test(raw.location || '');
    const isRemote =
      !isHybridOrOnsite &&
      (raw.isRemote === true ||
        workplace === 'remote' ||
        /remote/i.test(raw.location || ''));

    if (isRemote) {
      remoteKept++;
    }

    if (remoteOnly && !isRemote) {
      continue;
    }

    // Extract unique country names
    const countriesSet = new Set<string>();
    const primaryCountry = raw.address?.postalAddress?.addressCountry?.trim();
    if (primaryCountry) {
      countriesSet.add(primaryCountry);
    }

    if (Array.isArray(raw.secondaryLocations)) {
      for (const sec of raw.secondaryLocations) {
        const secCountry = sec.address?.postalAddress?.addressCountry?.trim();
        if (secCountry) {
          countriesSet.add(secCountry);
        }
      }
    }

    const eligibleCountries = Array.from(countriesSet);
    let isWorldwide: boolean | null = null;
    if (eligibleCountries.length > 0) {
      isWorldwide = false;
    } else {
      isWorldwide = null;
    }

    // Salary extraction from summaryComponents
    let salaryMin: number | null = null;
    let salaryMax: number | null = null;
    let currency: string | null = null;

    if (Array.isArray(raw.compensation?.summaryComponents)) {
      const salaryComp = raw.compensation.summaryComponents.find(
        (c) => c.compensationType === 'Salary'
      );
      if (salaryComp) {
        salaryMin =
          typeof salaryComp.minValue === 'number' && salaryComp.minValue > 0
            ? salaryComp.minValue
            : null;
        salaryMax =
          typeof salaryComp.maxValue === 'number' && salaryComp.maxValue > 0
            ? salaryComp.maxValue
            : null;
        currency = salaryMin || salaryMax ? salaryComp.currencyCode || null : null;
      }
    }

    // Description: descriptionPlain or htmlToText(descriptionHtml)
    const description = raw.descriptionPlain?.trim()
      ? htmlToText(raw.descriptionPlain)
      : htmlToText(raw.descriptionHtml);

    // Tags
    const tags: string[] = [];
    if (raw.department) tags.push(raw.department.trim());
    if (raw.team && !tags.includes(raw.team.trim())) {
      tags.push(raw.team.trim());
    }

    const postedAt = toDate(raw.publishedAt) || now;

    normalized.push({
      id: `ashby:${externalId}`,
      source: 'ashby',
      title,
      company,
      url,
      description,
      tags,
      locationText: raw.location ? raw.location.trim() : (isRemote ? 'Remote' : ''),
      isWorldwide,
      eligibleCountries,
      isRemote,
      trust: 'direct',
      companyBoard: {
        platform: 'ashby',
        token,
      },
      seniority: null,
      employmentType: raw.employmentType ? raw.employmentType.trim() : null,
      salaryMin,
      salaryMax,
      currency,
      postedAt,
      expiresAt: null,
      fetchedAt: now,
    });
  }

  return { jobs: normalized, totalJobs, remoteKept };
}

let lastRunDetails: CompanyRunDetail[] = [];

export const ashbyAdapter: SourceAdapter = {
  id: 'ashby',
  getLastRunDetails() {
    return lastRunDetails;
  },
  async fetchJobs(opts?: FetchOptions): Promise<NormalizedJob[]> {
    const remoteOnly = opts?.remoteOnly ?? true;
    const companies: CompanyConfig[] =
      (opts?.companies as CompanyConfig[]) ?? getCompanies('ashby');

    const allJobs: NormalizedJob[] = [];
    const details: CompanyRunDetail[] = [];

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      if (i > 0) await sleep(250);

      try {
        const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(
          company.token
        )}?includeCompensation=true`;
        const data = await fetchJson<AshbyApiResponse>(url);
        const { jobs, totalJobs, remoteKept } = normalizeAshbyJobs(
          data?.jobs || [],
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
        console.warn(`[Ashby] Failed for ${company.name} (${company.token}): ${message}`);
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

export default ashbyAdapter;
