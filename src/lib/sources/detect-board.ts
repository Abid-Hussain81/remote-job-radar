import type { CompanyBoardPlatform } from '@/types/job';

export interface DetectedBoard {
  platform: CompanyBoardPlatform;
  token: string;
}

/**
 * Detects company board platform and token from public career board URLs.
 * Handles Greenhouse, Lever, and Ashby URLs; returns null for non-matching URLs.
 *
 * Supported formats:
 * - https://boards.greenhouse.io/<token>[/jobs/...]
 * - https://job-boards.greenhouse.io/<token>[/jobs/...]
 * - https://jobs.lever.co/<token>[/...]
 * - https://jobs.ashbyhq.com/<token>[/...]
 */
export function detectBoardFromUrl(url: string | null | undefined): DetectedBoard | null {
  if (!url || typeof url !== 'string') return null;

  let parsed: URL;
  try {
    const trimmed = url.trim();
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const token = segments[0].toLowerCase();

  // Greenhouse: boards.greenhouse.io or job-boards.greenhouse.io
  if (
    hostname === 'boards.greenhouse.io' ||
    hostname === 'job-boards.greenhouse.io'
  ) {
    // Exclude generic endpoints like 'embed'
    if (token && token !== 'embed') {
      return { platform: 'greenhouse', token };
    }
  }

  // Lever: jobs.lever.co or jobs.eu.lever.co
  if (hostname === 'jobs.lever.co' || hostname === 'jobs.eu.lever.co') {
    if (token) {
      return { platform: 'lever', token };
    }
  }

  // Ashby: jobs.ashbyhq.com
  if (hostname === 'jobs.ashbyhq.com') {
    if (token) {
      return { platform: 'ashby', token };
    }
  }

  return null;
}
