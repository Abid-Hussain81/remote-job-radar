import { describe, it, expect } from 'vitest';
import { runAllSources } from './index';
import type { SourceAdapter } from './types';
import type { NormalizedJob } from '@/types/job';

describe('src/lib/sources/index - runAllSources', () => {
  const dummyJobA: NormalizedJob = {
    id: 'remoteok:999',
    source: 'remoteok',
    title: 'Frontend Engineer',
    company: 'Alpha Inc',
    url: 'https://example.com/job/a',
    description: 'Frontend role',
    tags: ['react'],
    locationText: 'Worldwide',
    isWorldwide: true,
    eligibleCountries: [],
    isRemote: true,
    trust: 'aggregator',
    companyBoard: null,
    seniority: null,
    employmentType: 'Full-time',
    salaryMin: 100000,
    salaryMax: 120000,
    currency: 'USD',
    postedAt: new Date(),
    expiresAt: null,
    fetchedAt: new Date(),
  };

  const dummyJobB: NormalizedJob = {
    id: 'wwr:888',
    source: 'wwr',
    title: 'Backend Engineer',
    company: 'Beta LLC',
    url: 'https://example.com/job/b',
    description: 'Backend role',
    tags: ['node'],
    locationText: 'USA',
    isWorldwide: false,
    eligibleCountries: ['USA'],
    isRemote: true,
    trust: 'aggregator',
    companyBoard: null,
    seniority: 'Senior',
    employmentType: 'Full-time',
    salaryMin: null,
    salaryMax: null,
    currency: null,
    postedAt: new Date(),
    expiresAt: null,
    fetchedAt: new Date(),
  };

  it('safely isolates a failing adapter without aborting others', async () => {
    const mockSuccess1: SourceAdapter = {
      id: 'remoteok',
      fetchJobs: async () => [dummyJobA],
    };

    const mockFailure: SourceAdapter = {
      id: 'jobicy',
      fetchJobs: async () => {
        throw new Error('503 Service Unavailable');
      },
    };

    const mockSuccess2: SourceAdapter = {
      id: 'wwr',
      fetchJobs: async () => [dummyJobB],
    };

    const { jobs, results } = await runAllSources({}, [
      mockSuccess1,
      mockFailure,
      mockSuccess2,
    ]);

    // Both successful adapters returned their jobs
    expect(jobs).toHaveLength(2);
    expect(jobs.map((j) => j.id)).toEqual(['remoteok:999', 'wwr:888']);

    // Check results status
    expect(results).toHaveLength(3);

    const res1 = results.find((r) => r.source === 'remoteok');
    expect(res1?.ok).toBe(true);
    expect(res1?.count).toBe(1);

    const resFail = results.find((r) => r.source === 'jobicy');
    expect(resFail?.ok).toBe(false);
    expect(resFail?.count).toBe(0);
    expect(resFail?.error).toContain('503 Service Unavailable');

    const res2 = results.find((r) => r.source === 'wwr');
    expect(res2?.ok).toBe(true);
    expect(res2?.count).toBe(1);
  });
});
