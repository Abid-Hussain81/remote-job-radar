import type { NormalizedJob } from '@/types/job';
import type { SourceAdapter, FetchOptions, CompanyRunDetail } from './types';
import { fetchJson } from './http';
import { htmlToText, decodeHtmlEntities, toDate } from './clean';
import { getCompanies, type CompanyConfig } from './companies';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GreenhouseOffice {
  name?: string;
  location?: string;
  [key: string]: unknown;
}

export interface GreenhouseDepartment {
  name?: string;
  [key: string]: unknown;
}

export interface GreenhouseRawJob {
  id?: number | string;
  title?: string;
  absolute_url?: string;
  location?: { name?: string };
  updated_at?: string;
  first_published?: string;
  company_name?: string;
  content?: string;
  departments?: GreenhouseDepartment[];
  offices?: GreenhouseOffice[];
  [key: string]: unknown;
}

export interface GreenhouseApiResponse {
  jobs?: GreenhouseRawJob[];
  [key: string]: unknown;
}

/**
 * Extracts country names from Greenhouse office names and location strings.
 */
function extractGreenhouseCountries(offices: GreenhouseOffice[] = []): string[] {
  const countries = new Set<string>();

  for (const office of offices) {
    const officeName = (office.name || '').trim();
    const officeLoc = (office.location || '').trim();

    // Check for "Remote - Country" or "Remote, Country"
    const remoteMatch = officeName.match(/remote\s*[-–:]\s*([a-zA-Z\s]+)/i);
    if (remoteMatch && remoteMatch[1]) {
      const candidate = remoteMatch[1].trim();
      if (candidate.toLowerCase() !== 'us' && candidate.toLowerCase() !== 'usa') {
        countries.add(candidate);
      } else {
        countries.add('United States');
      }
    }

    // Check last segment of location (e.g. "Canberra, Australian Capital Territory, Australia")
    if (officeLoc) {
      const parts = officeLoc.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (
          lastPart &&
          !/^\d+$/.test(lastPart) &&
          lastPart.toLowerCase() !== 'remote'
        ) {
          if (lastPart.toLowerCase() === 'us' || lastPart.toLowerCase() === 'usa') {
            countries.add('United States');
          } else {
            countries.add(lastPart);
          }
        }
      }
    }
  }

  return Array.from(countries);
}

/**
 * Pure normalization function for Greenhouse raw job items for a specific company token.
 */
export function normalizeGreenhouseJobs(
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
    const raw = item as GreenhouseRawJob;

    if (!raw.id) continue;
    totalJobs++;

    const externalId = `${token}-${raw.id}`;
    const title = (raw.title || '').trim();
    const url = (raw.absolute_url || '').trim();
    const company = (raw.company_name || fallbackCompanyName || '').trim();

    if (!title || !url || !company) {
      continue;
    }

    const locationName = (raw.location?.name || '').trim();
    const offices = Array.isArray(raw.offices) ? raw.offices : [];

    // Check if remote: location name or any office name matches /remote/i, but hybrid/office-only -> false
    const isHybrid =
      /hybrid/i.test(locationName) ||
      offices.some((o) => /hybrid/i.test(o.name || ''));
    const isLocationRemote = /remote/i.test(locationName);
    const hasRemoteOffice = offices.some((o) => /remote/i.test(o.name || ''));
    const isRemote = !isHybrid && (isLocationRemote || hasRemoteOffice);

    if (isRemote) {
      remoteKept++;
    }

    if (remoteOnly && !isRemote) {
      continue;
    }

    // Derive eligible countries
    const countries = extractGreenhouseCountries(offices);
    let isWorldwide: boolean | null = null;
    let eligibleCountries: string[] = [];

    if (countries.length > 0) {
      isWorldwide = false;
      eligibleCountries = countries;
    } else {
      // The only remote hint is bare "Remote" with no specific country
      isWorldwide = null;
      eligibleCountries = [];
    }

    // Departments as tags
    const tags = Array.isArray(raw.departments)
      ? raw.departments.map((d) => (d.name || '').trim()).filter(Boolean)
      : [];

    // Date
    const postedAt =
      toDate(raw.first_published) || toDate(raw.updated_at) || now;

    // Content: decode escaped entities first, then htmlToText
    const decodedContent = decodeHtmlEntities(raw.content || '');
    const description = htmlToText(decodedContent);

    normalized.push({
      id: `greenhouse:${externalId}`,
      source: 'greenhouse',
      title,
      company,
      url,
      description,
      tags,
      locationText: locationName || (isRemote ? 'Remote' : ''),
      isWorldwide,
      eligibleCountries,
      isRemote,
      trust: 'direct',
      companyBoard: {
        platform: 'greenhouse',
        token,
      },
      seniority: null,
      employmentType: null,
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

export const greenhouseAdapter: SourceAdapter = {
  id: 'greenhouse',
  getLastRunDetails() {
    return lastRunDetails;
  },
  async fetchJobs(opts?: FetchOptions): Promise<NormalizedJob[]> {
    const remoteOnly = opts?.remoteOnly ?? true;
    const companies: CompanyConfig[] =
      (opts?.companies as CompanyConfig[]) ?? getCompanies('greenhouse');

    const allJobs: NormalizedJob[] = [];
    const details: CompanyRunDetail[] = [];

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      if (i > 0) await sleep(250);

      try {
        const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
          company.token
        )}/jobs?content=true`;
        const data = await fetchJson<GreenhouseApiResponse>(url);
        const { jobs, totalJobs, remoteKept } = normalizeGreenhouseJobs(
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
        console.warn(`[Greenhouse] Failed for ${company.name} (${company.token}): ${message}`);
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

export default greenhouseAdapter;
