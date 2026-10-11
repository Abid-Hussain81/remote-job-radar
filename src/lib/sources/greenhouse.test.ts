import { describe, it, expect } from 'vitest';
import { normalizeGreenhouseJobs } from './greenhouse';
import greenhouseFixture from '../../../data/fixtures/greenhouse.json';

describe('src/lib/sources/greenhouse', () => {
  it('normalizes Greenhouse fixture and filters non-remote jobs', () => {
    // 3 jobs in fixture:
    // 5001: Remote - Australia (remote kept)
    // 5002: Remote (bare remote kept)
    // 5003: Hybrid - London (dropped when remoteOnly: true)
    const { jobs, totalJobs, remoteKept } = normalizeGreenhouseJobs(
      greenhouseFixture.jobs,
      'vercel',
      'Vercel',
      true // remoteOnly
    );

    expect(totalJobs).toBe(3);
    expect(remoteKept).toBe(2);
    expect(jobs).toHaveLength(2);

    // Job 1
    const job1 = jobs[0];
    expect(job1.id).toBe('greenhouse:vercel-5001');
    expect(job1.source).toBe('greenhouse');
    expect(job1.title).toBe('Senior Frontend Engineer');
    expect(job1.company).toBe('Vercel');
    expect(job1.trust).toBe('direct');
    expect(job1.companyBoard).toEqual({
      platform: 'greenhouse',
      token: 'vercel',
    });
    expect(job1.isRemote).toBe(true);
    expect(job1.isWorldwide).toBe(false);
    expect(job1.eligibleCountries).toContain('Australia');
    // Content should have decoded &lt;strong&gt; to plain text
    expect(job1.description).toContain('Next.js');
    expect(job1.description).not.toContain('&lt;');
    expect(job1.tags).toEqual(['Engineering']);

    // Job 2 (Bare remote, no specific country)
    const job2 = jobs[1];
    expect(job2.id).toBe('greenhouse:vercel-5002');
    expect(job2.isRemote).toBe(true);
    expect(job2.isWorldwide).toBeNull();
    expect(job2.eligibleCountries).toEqual([]);
  });

  it('includes non-remote jobs when remoteOnly is false', () => {
    const { jobs, totalJobs, remoteKept } = normalizeGreenhouseJobs(
      greenhouseFixture.jobs,
      'vercel',
      'Vercel',
      false // remoteOnly = false
    );

    expect(totalJobs).toBe(3);
    expect(remoteKept).toBe(2);
    expect(jobs).toHaveLength(3);
    expect(jobs.some((j) => j.id === 'greenhouse:vercel-5003')).toBe(true);
  });
});
