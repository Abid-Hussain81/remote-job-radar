import { describe, it, expect } from 'vitest';
import {
  validateCompanies,
  getCompanies,
  COMPANIES,
} from './companies';

describe('src/lib/sources/companies', () => {
  it('validates loaded COMPANIES singleton correctly', () => {
    expect(COMPANIES.length).toBeGreaterThan(0);
    const vercel = COMPANIES.find((c) => c.token === 'vercel');
    expect(vercel).toEqual({
      name: 'Vercel',
      platform: 'greenhouse',
      token: 'vercel',
    });
  });

  it('filters companies by platform', () => {
    const gh = getCompanies('greenhouse');
    expect(gh.every((c) => c.platform === 'greenhouse')).toBe(true);
    expect(gh.length).toBeGreaterThan(0);

    const lever = getCompanies('lever');
    expect(lever.every((c) => c.platform === 'lever')).toBe(true);

    const ashby = getCompanies('ashby');
    expect(ashby.every((c) => c.platform === 'ashby')).toBe(true);
  });

  it('rejects duplicate (platform, token) configurations', () => {
    const invalidList = [
      { name: 'Vercel Primary', platform: 'greenhouse', token: 'vercel' },
      { name: 'Vercel Secondary', platform: 'greenhouse', token: 'vercel' },
    ];

    expect(() => validateCompanies(invalidList)).toThrow(
      /Duplicate company board detected/i
    );
  });

  it('rejects invalid or missing schema fields', () => {
    const invalidList = [
      { name: '', platform: 'unknown-platform', token: 'token' },
    ];

    expect(() => validateCompanies(invalidList)).toThrow();
  });
});
