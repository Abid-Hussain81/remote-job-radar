import { describe, it, expect } from 'vitest';
import { normalizeAshbyJobs } from './ashby';
import ashbyFixture from '../../../data/fixtures/ashby.json';

describe('src/lib/sources/ashby', () => {
  it('normalizes Ashby fixture, parses secondaryLocations countries, and extracts salary', () => {
    // 4 items:
    // ash-7001: remote, Germany + secondary France, Spain, salary 100k-130k EUR (kept)
    // ash-7002: isListed: false (skipped)
    // ash-7003: OnSite (dropped when remoteOnly: true)
    // ash-7004: remote, no addressCountry (kept, isWorldwide: null)
    const { jobs, totalJobs, remoteKept } = normalizeAshbyJobs(
      ashbyFixture.jobs,
      'ashby',
      'Ashby',
      true
    );

    expect(totalJobs).toBe(3); // 7002 isListed: false is skipped before totalJobs count or inside loop
    expect(remoteKept).toBe(2);
    expect(jobs).toHaveLength(2);

    // Job 1
    const job1 = jobs[0];
    expect(job1.id).toBe('ashby:ashby-ash-7001');
    expect(job1.source).toBe('ashby');
    expect(job1.title).toBe('Senior Product Designer');
    expect(job1.company).toBe('Ashby');
    expect(job1.trust).toBe('direct');
    expect(job1.companyBoard).toEqual({
      platform: 'ashby',
      token: 'ashby',
    });
    expect(job1.isRemote).toBe(true);
    expect(job1.isWorldwide).toBe(false);
    expect(job1.eligibleCountries).toContain('Germany');
    expect(job1.eligibleCountries).toContain('France');
    expect(job1.eligibleCountries).toContain('Spain');
    expect(job1.salaryMin).toBe(100000);
    expect(job1.salaryMax).toBe(130000);
    expect(job1.currency).toBe('EUR');

    // Job 2 (ash-7004, no country specified)
    const job2 = jobs[1];
    expect(job2.id).toBe('ashby:ashby-ash-7004');
    expect(job2.isWorldwide).toBeNull();
    expect(job2.eligibleCountries).toEqual([]);
  });

  it('keeps onsite jobs when remoteOnly is false', () => {
    const { jobs } = normalizeAshbyJobs(
      ashbyFixture.jobs,
      'ashby',
      'Ashby',
      false
    );

    expect(jobs).toHaveLength(3);
    expect(jobs.some((j) => j.id === 'ashby:ashby-ash-7003')).toBe(true);
  });
});
