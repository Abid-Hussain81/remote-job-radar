import { describe, it, expect } from 'vitest';
import { normalizeLeverPostings } from './lever';
import leverFixture from '../../../data/fixtures/lever.json';

describe('src/lib/sources/lever', () => {
  it('normalizes Lever fixture, handles ISO-2 country codes and description fallback', () => {
    // 3 postings:
    // lev-6001: remote Sweden (kept)
    // lev-6002: remote with empty descriptionPlain, HTML + lists + additionalPlain (kept)
    // lev-6003: hybrid (dropped when remoteOnly: true)
    const { jobs, totalJobs, remoteKept } = normalizeLeverPostings(
      leverFixture,
      'spotify',
      'Spotify',
      true
    );

    expect(totalJobs).toBe(3);
    expect(remoteKept).toBe(2);
    expect(jobs).toHaveLength(2);

    // Job 1
    const job1 = jobs[0];
    expect(job1.id).toBe('lever:spotify-lev-6001');
    expect(job1.source).toBe('lever');
    expect(job1.title).toBe('Fullstack Engineer');
    expect(job1.company).toBe('Spotify');
    expect(job1.trust).toBe('direct');
    expect(job1.companyBoard).toEqual({
      platform: 'lever',
      token: 'spotify',
    });
    expect(job1.isRemote).toBe(true);
    expect(job1.isWorldwide).toBe(false);
    expect(job1.eligibleCountries).toEqual(['Sweden']);
    expect(job1.postedAt).toBeInstanceOf(Date);
    expect(job1.tags).toEqual(['Engineering', 'Web Platform']);

    // Job 2 (empty descriptionPlain fallback to lists and additionalPlain)
    const job2 = jobs[1];
    expect(job2.id).toBe('lever:spotify-lev-6002');
    expect(job2.description).toContain('telemetry pipelines');
    expect(job2.description).toContain('Key Qualifications');
    expect(job2.description).toContain('5+ years Node.js and TypeScript');
    expect(job2.description).toContain('We celebrate diversity and equality');
  });

  it('keeps hybrid jobs when remoteOnly is false', () => {
    const { jobs } = normalizeLeverPostings(
      leverFixture,
      'spotify',
      'Spotify',
      false
    );

    expect(jobs).toHaveLength(3);
    expect(jobs.some((j) => j.id === 'lever:spotify-lev-6003')).toBe(true);
  });
});
