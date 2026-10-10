import { XMLParser } from 'fast-xml-parser';
import type { NormalizedJob } from '@/types/job';
import type { SourceAdapter } from './types';
import { fetchText } from './http';
import { htmlToText, parseCountryList, toDate } from './clean';

export const WWR_FEED_URLS = [
  'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
];

export interface WwrRawItem {
  title?: string;
  region?: string;
  country?: string;
  state?: string;
  skills?: string;
  category?: string;
  type?: string;
  description?: string;
  pubDate?: string;
  expires_at?: string;
  guid?: string | { '#text'?: string };
  link?: string;
  [key: string]: unknown;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

/**
 * Extracts raw items from RSS XML string.
 */
export function extractWwrItemsFromXml(xmlText: string): WwrRawItem[] {
  if (!xmlText) return [];
  try {
    const parsed = xmlParser.parse(xmlText);
    const channel = parsed?.rss?.channel;
    if (!channel || !channel.item) return [];

    return Array.isArray(channel.item) ? channel.item : [channel.item];
  } catch {
    return [];
  }
}

/**
 * Pure normalization function for WWR raw RSS items.
 */
export function normalizeWwrItems(items: WwrRawItem[]): NormalizedJob[] {
  const normalized: NormalizedJob[] = [];
  const now = new Date();

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    const rawGuid =
      typeof item.guid === 'object' && item.guid !== null
        ? item.guid['#text'] || ''
        : String(item.guid || '');

    const rawTitle = (item.title || '').trim();
    const rawLink = (item.link || '').trim();

    if (!rawTitle || !rawLink) {
      continue;
    }

    // Split "Company: Role" on the FIRST ": "
    let company = '';
    let title = rawTitle;
    const colonIndex = rawTitle.indexOf(': ');
    if (colonIndex !== -1) {
      company = rawTitle.slice(0, colonIndex).trim();
      title = rawTitle.slice(colonIndex + 2).trim();
    } else {
      company = 'We Work Remotely';
      title = rawTitle;
    }

    if (!title || !company) {
      continue;
    }

    // External ID: last path segment of the link (slug), fallback to guid
    const urlSegments = rawLink.split('?')[0].split('/').filter(Boolean);
    const slug = urlSegments[urlSegments.length - 1] || rawGuid;
    if (!slug) {
      continue;
    }

    const postedDate = toDate(item.pubDate);
    if (!postedDate) {
      continue;
    }

    const region = (item.region || '').trim();
    const countryRaw = (item.country || '').trim();
    const countries = parseCountryList(countryRaw);

    let isWorldwide: boolean | null = null;
    let eligibleCountries: string[] = [];
    let locationText = region;

    if (region === 'Anywhere in the World' && countries.length === 0) {
      isWorldwide = true;
      eligibleCountries = [];
      locationText = 'Anywhere in the World';
    } else if (countries.length > 0) {
      isWorldwide = false;
      eligibleCountries = countries;
      locationText = region ? `${region} (${countryRaw})` : countryRaw;
    } else if (region) {
      isWorldwide = false;
      eligibleCountries = [];
      locationText = region;
    } else {
      isWorldwide = null;
      eligibleCountries = [];
      locationText = '';
    }

    // Tags from skills split on ", "
    const tags: string[] = [];
    if (item.skills) {
      const splitSkills = String(item.skills)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      tags.push(...splitSkills);
    }
    if (item.category && !tags.includes(String(item.category).trim())) {
      tags.push(String(item.category).trim());
    }

    normalized.push({
      id: `wwr:${slug}`,
      source: 'wwr',
      title,
      company,
      url: rawLink,
      description: htmlToText(item.description),
      tags,
      locationText,
      isWorldwide,
      eligibleCountries,
      seniority: null,
      employmentType: item.type ? String(item.type).trim() : null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      postedAt: postedDate,
      expiresAt: toDate(item.expires_at),
      fetchedAt: now,
    });
  }

  return normalized;
}

/**
 * Pure normalization helper that accepts raw XML string.
 */
export function normalizeWwrXml(xmlText: string): NormalizedJob[] {
  const items = extractWwrItemsFromXml(xmlText);
  return normalizeWwrItems(items);
}

export const wwrAdapter: SourceAdapter = {
  id: 'wwr',
  async fetchJobs(): Promise<NormalizedJob[]> {
    const seenIds = new Set<string>();
    const allJobs: NormalizedJob[] = [];

    // Fetch category feeds sequentially
    for (const feedUrl of WWR_FEED_URLS) {
      try {
        const xmlText = await fetchText(feedUrl);
        const jobs = normalizeWwrXml(xmlText);

        for (const job of jobs) {
          if (!seenIds.has(job.id)) {
            seenIds.add(job.id);
            allJobs.push(job);
          }
        }
      } catch (err) {
        // Log warning and continue to next feed
        console.warn(`[WWR] Failed to fetch feed ${feedUrl}:`, err);
      }
    }

    return allJobs;
  },
};

export default wwrAdapter;
