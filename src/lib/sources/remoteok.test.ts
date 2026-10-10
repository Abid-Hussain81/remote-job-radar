import { describe, it, expect } from 'vitest';
import { normalizeRemoteOk } from './remoteok';
import remoteOkFixture from '../../../data/fixtures/remoteok.json';

describe('src/lib/sources/remoteok', () => {
  it('normalizes RemoteOK feed fixture correctly', () => {
    const jobs = normalizeRemoteOk(remoteOkFixture);

    // Fixture has 5 elements:
    // 0: legal notice (skip)
    // 1: valid worldwide job with salary
    // 2: valid US job with salary 0
    // 3: valid job with location ""
    // 4: incomplete job (missing position, skip)
    expect(jobs).toHaveLength(3);

    // Job 1
    const job1 = jobs[0];
    expect(job1.id).toBe('remoteok:1001');
    expect(job1.source).toBe('remoteok');
    expect(job1.title).toBe('Senior Full Stack Engineer');
    expect(job1.company).toBe('Acme Tech');
    expect(job1.url).toBe('https://remoteok.com/job/1001');
    expect(job1.isWorldwide).toBe(true);
    expect(job1.eligibleCountries).toEqual([]);
    expect(job1.locationText).toBe('Worldwide');
    expect(job1.salaryMin).toBe(120000);
    expect(job1.salaryMax).toBe(160000);
    expect(job1.currency).toBe('USD');
    expect(job1.tags).toEqual(['react', 'node', 'typescript']);
    expect(job1.description).toContain('Senior Engineer');

    // Job 2 (salary 0 -> null, currency -> null, location "United States" -> isWorldwide: false)
    const job2 = jobs[1];
    expect(job2.id).toBe('remoteok:1002');
    expect(job2.title).toBe('Backend Architect');
    expect(job2.isWorldwide).toBe(false);
    expect(job2.locationText).toBe('United States');
    expect(job2.salaryMin).toBeNull();
    expect(job2.salaryMax).toBeNull();
    expect(job2.currency).toBeNull();

    // Job 3 (location "" -> isWorldwide: null)
    const job3 = jobs[2];
    expect(job3.id).toBe('remoteok:1003');
    expect(job3.isWorldwide).toBeNull();
    expect(job3.locationText).toBe('');
    expect(job3.salaryMin).toBe(80000);
    expect(job3.currency).toBe('USD');
  });

  it('safely handles empty or non-array input', () => {
    expect(normalizeRemoteOk([])).toEqual([]);
    expect(normalizeRemoteOk(null as unknown as unknown[])).toEqual([]);
  });
});
