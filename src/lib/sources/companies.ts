import { z } from 'zod';
import companiesData from '../../../data/companies.json';
import type { CompanyBoardPlatform } from '@/types/job';

export const CompanyConfigSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  platform: z.enum(['greenhouse', 'lever', 'ashby']),
  token: z.string().min(1, 'Board token is required'),
});

export type CompanyConfig = z.infer<typeof CompanyConfigSchema>;

/**
 * Validates an array of company board configurations and ensures no duplicate (platform, token) pairs exist.
 */
export function validateCompanies(raw: unknown): CompanyConfig[] {
  const parsed = z.array(CompanyConfigSchema).parse(raw);

  const seen = new Set<string>();
  for (const item of parsed) {
    const key = `${item.platform}:${item.token.toLowerCase().trim()}`;
    if (seen.has(key)) {
      throw new Error(
        `Duplicate company board detected: platform "${item.platform}" with token "${item.token}"`
      );
    }
    seen.add(key);
  }

  return parsed;
}

// Validated singleton list of companies loaded from data/companies.json
export const COMPANIES: CompanyConfig[] = validateCompanies(companiesData);

/**
 * Returns companies from the registry, optionally filtered by platform.
 */
export function getCompanies(
  platform?: CompanyBoardPlatform,
  sourceList: CompanyConfig[] = COMPANIES
): CompanyConfig[] {
  if (!platform) {
    return sourceList;
  }
  return sourceList.filter((c) => c.platform === platform);
}
