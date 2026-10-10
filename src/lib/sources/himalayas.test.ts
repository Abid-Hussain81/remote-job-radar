import { describe, it, expect } from 'vitest';
import { normalizeHimalayas } from './himalayas';
import himalayasFixture from '../../../data/fixtures/himalayas.json';

describe('src/lib/sources/himalayas', () => {
  const referenceNow = new Date('2026-10-10T12:00:00Z');

  it('normalizes Himalayas fixture and filters expired/stale items', () => {
    const { jobs, reachedStaleCutoff } = normalizeHimalayas(
      himalayasFixture.jobs,
      referenceNow
    );

    // 5 items in fixture:
    // 1: valid active worldwide job
    // 2: valid active regional job
    // 3: expired job (dropped)
    // 4: stale job (>30 days old, dropped)
    // 5: missing guid (skipped)
    expect(jobs).toHaveLength(2);
    expect(reachedStaleCutoff).toBe(true);

    // Job 1 (Worldwide, DevOps)
    const job1 = jobs[0];
    expect(job1.id).toBe('himalayas:him-3001');
    expect(job1.source).toBe('himalayas');
    expect(job1.title).toBe('Lead DevOps Engineer');
    expect(job1.company).toBe('Nebula Cloud');
    expect(job1.url).toBe(
      'https://himalayas.app/jobs/nebula-cloud/lead-devops-engineer'
    );
    expect(job1.isWorldwide).toBe(true);
    expect(job1.eligibleCountries).toEqual([]);
    expect(job1.seniority).toBe('Lead');
    expect(job1.salaryMin).toBe(130000);
    expect(job1.salaryMax).toBe(170000);
    expect(job1.currency).toBe('USD');
    expect(job1.tags).toEqual(['DevOps', 'Kubernetes', 'AWS']);
    expect(job1.postedAt).toBeInstanceOf(Date);
    expect(job1.expiresAt).toBeInstanceOf(Date);

    // Job 2 (Germany, Austria)
    const job2 = jobs[1];
    expect(job2.id).toBe('himalayas:him-3002');
    expect(job2.isWorldwide).toBe(false);
    expect(job2.eligibleCountries).toEqual(['Germany', 'Austria']);
    expect(job2.locationText).toBe('Germany, Austria');
    expect(job2.seniority).toBe('Senior');
    expect(job2.currency).toBe('EUR');
  });

  it('safely handles empty array or invalid inputs', () => {
    const res = normalizeHimalayas([]);
    expect(res.jobs).toEqual([]);
    expect(res.reachedStaleCutoff).toBe(false);
  });
});
