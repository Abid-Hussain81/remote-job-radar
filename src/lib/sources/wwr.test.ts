import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { normalizeWwrXml } from './wwr';

describe('src/lib/sources/wwr', () => {
  it('normalizes WWR RSS XML fixture correctly', () => {
    const fixturePath = path.resolve(
      import.meta.dirname,
      '../../../data/fixtures/wwr.xml'
    );
    const xmlContent = fs.readFileSync(fixturePath, 'utf-8');
    const jobs = normalizeWwrXml(xmlContent);

    // 4 items in fixture, item 4 missing link -> 3 valid jobs
    expect(jobs).toHaveLength(3);

    // Job 1 (Europe & Africa with country list)
    const job1 = jobs[0];
    expect(job1.id).toBe('wwr:stripe-senior-platform-engineer');
    expect(job1.source).toBe('wwr');
    expect(job1.company).toBe('Stripe');
    expect(job1.title).toBe('Senior Platform Engineer');
    expect(job1.isWorldwide).toBe(false);
    expect(job1.eligibleCountries).toEqual([
      'Andorra',
      'Albania',
      'South Africa',
    ]);
    expect(job1.employmentType).toBe('Full-Time');
    expect(job1.tags).toContain('TypeScript');
    expect(job1.tags).toContain('Full-Stack Programming');

    // Job 2 (Anywhere in the World, empty country)
    const job2 = jobs[1];
    expect(job2.id).toBe('wwr:gitlab-staff-backend-engineer');
    expect(job2.company).toBe('GitLab');
    expect(job2.title).toBe('Staff Backend Engineer');
    expect(job2.isWorldwide).toBe(true);
    expect(job2.eligibleCountries).toEqual([]);
    expect(job2.locationText).toBe('Anywhere in the World');

    // Job 3 (USA Only)
    const job3 = jobs[2];
    expect(job3.id).toBe('wwr:shopify-frontend-developer');
    expect(job3.company).toBe('Shopify');
    expect(job3.title).toBe('Frontend Developer');
    expect(job3.isWorldwide).toBe(false);
    expect(job3.locationText).toBe('USA Only');
  });

  it('handles invalid or empty XML gracefully', () => {
    expect(normalizeWwrXml('')).toEqual([]);
    expect(normalizeWwrXml('<invalid>xml')).toEqual([]);
  });
});
