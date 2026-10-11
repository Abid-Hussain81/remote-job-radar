import { describe, it, expect } from 'vitest';
import type { Job } from '@/types/job';

describe('Job type and project sanity', () => {
  it('instantiates a valid normalized Job object structure', () => {
    const sampleJob: Job = {
      id: 'remoteok:12345',
      source: 'remoteok',
      title: 'Senior TypeScript Engineer',
      company: 'Acme Corp',
      url: 'https://remoteok.com/job/12345',
      description: 'Exciting remote role with TypeScript and Next.js',
      tags: ['typescript', 'react', 'nextjs'],
      locationText: 'Worldwide',
      isWorldwide: true,
      eligibleCountries: [],
      isRemote: true,
      trust: 'aggregator',
      companyBoard: null,
      seniority: 'senior',
      employmentType: 'full-time',
      salaryMin: 120000,
      salaryMax: 150000,
      currency: 'USD',
      postedAt: new Date('2026-10-10T12:00:00Z'),
      expiresAt: null,
      fetchedAt: new Date('2026-10-10T12:30:00Z'),
      status: 'new',
      score: 85,
      matchedKeywords: ['typescript', 'nextjs'],
      scoreReasons: ['+50 title match', '+35 tag match'],
    };

    expect(sampleJob.id).toBe('remoteok:12345');
    expect(sampleJob.score).toBe(85);
    expect(sampleJob.status).toBe('new');
  });
});
