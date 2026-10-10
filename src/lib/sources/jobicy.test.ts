import { describe, it, expect } from 'vitest';
import { normalizeJobicy } from './jobicy';
import jobicyFixture from '../../../data/fixtures/jobicy.json';

describe('src/lib/sources/jobicy', () => {
  it('normalizes Jobicy fixture correctly', () => {
    const jobs = normalizeJobicy(jobicyFixture.jobs);

    // Fixture has 4 items, item 4 has missing url -> 3 valid jobs
    expect(jobs).toHaveLength(3);

    // Job 1 (Anywhere -> isWorldwide: true)
    const job1 = jobs[0];
    expect(job1.id).toBe('jobicy:2001');
    expect(job1.source).toBe('jobicy');
    expect(job1.title).toBe('Senior React Developer');
    expect(job1.company).toBe('CloudScale');
    expect(job1.isWorldwide).toBe(true);
    expect(job1.eligibleCountries).toEqual([]);
    expect(job1.seniority).toBe('Senior');
    expect(job1.employmentType).toBe('Full-Time');
    expect(job1.salaryMin).toBe(110000);
    expect(job1.salaryMax).toBe(140000);
    expect(job1.currency).toBe('USD');
    expect(job1.tags).toEqual(['Engineering', 'SaaS']);

    // Job 2 (Canada -> isWorldwide: false, CAD)
    const job2 = jobs[1];
    expect(job2.id).toBe('jobicy:2002');
    expect(job2.company).toBe('FinTech North');
    expect(job2.isWorldwide).toBe(false);
    expect(job2.eligibleCountries).toEqual(['Canada']);
    expect(job2.locationText).toBe('Canada');
    expect(job2.seniority).toBe('Mid-Level');
    expect(job2.employmentType).toBe('Full-Time, Contract');
    expect(job2.salaryMin).toBe(90000);
    expect(job2.currency).toBe('CAD');

    // Job 3 (salary 0 -> null)
    const job3 = jobs[2];
    expect(job3.id).toBe('jobicy:2003');
    expect(job3.salaryMin).toBeNull();
    expect(job3.salaryMax).toBeNull();
    expect(job3.currency).toBeNull();
  });

  it('safely handles empty array or invalid inputs', () => {
    expect(normalizeJobicy([])).toEqual([]);
    expect(normalizeJobicy(null as unknown as unknown[])).toEqual([]);
  });
});
