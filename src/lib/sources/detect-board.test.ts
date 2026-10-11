import { describe, it, expect } from 'vitest';
import { detectBoardFromUrl } from './detect-board';

describe('src/lib/sources/detect-board', () => {
  it('detects Greenhouse job board URLs', () => {
    expect(detectBoardFromUrl('https://boards.greenhouse.io/vercel')).toEqual({
      platform: 'greenhouse',
      token: 'vercel',
    });

    expect(
      detectBoardFromUrl('https://boards.greenhouse.io/gitlab/jobs/1234567')
    ).toEqual({
      platform: 'greenhouse',
      token: 'gitlab',
    });

    expect(
      detectBoardFromUrl('https://job-boards.greenhouse.io/stripe/jobs/7654321')
    ).toEqual({
      platform: 'greenhouse',
      token: 'stripe',
    });
  });

  it('detects Lever job board URLs', () => {
    expect(detectBoardFromUrl('https://jobs.lever.co/spotify')).toEqual({
      platform: 'lever',
      token: 'spotify',
    });

    expect(
      detectBoardFromUrl('https://jobs.lever.co/palantir/abc-123-xyz')
    ).toEqual({
      platform: 'lever',
      token: 'palantir',
    });

    expect(detectBoardFromUrl('https://jobs.eu.lever.co/somecompany')).toEqual({
      platform: 'lever',
      token: 'somecompany',
    });
  });

  it('detects Ashby job board URLs', () => {
    expect(detectBoardFromUrl('https://jobs.ashbyhq.com/ashby')).toEqual({
      platform: 'ashby',
      token: 'ashby',
    });

    expect(
      detectBoardFromUrl('https://jobs.ashbyhq.com/openai/uuid-position-123')
    ).toEqual({
      platform: 'ashby',
      token: 'openai',
    });
  });

  it('returns null for unsupported domains or empty inputs', () => {
    expect(detectBoardFromUrl('https://google.com')).toBeNull();
    expect(detectBoardFromUrl('https://weworkremotely.com/jobs')).toBeNull();
    expect(detectBoardFromUrl('https://boards.greenhouse.io/')).toBeNull();
    expect(detectBoardFromUrl('')).toBeNull();
    expect(detectBoardFromUrl(null)).toBeNull();
    expect(detectBoardFromUrl(undefined)).toBeNull();
  });
});
