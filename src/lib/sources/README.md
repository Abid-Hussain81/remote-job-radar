# Source Adapters Contract

This directory contains modular adapters for ingesting remote jobs from public feeds.

## Target Sources
- **RemoteOK API**: `https://remoteok.com/api`
- **We Work Remotely RSS**: `https://weworkremotely.com/categories/...rss`
- **Jobicy API**: `https://jobicy.com/api/v2/remote-jobs`
- **Himalayas API**: `https://himalayas.app/jobs/api`

## Adapter Interface Contract
Every source adapter must adhere to a standardized contract:

```typescript
import type { Job, JobSource } from '@/types/job';

export interface SourceAdapter {
  /** Identifier matching JobSource union */
  readonly source: JobSource;

  /** Human-readable display label */
  readonly name: string;

  /**
   * Fetches latest jobs from the source, sanitizes them, and normalizes
   * them into canonical Job objects ready for scoring and upserting.
   */
  fetchJobs(): Promise<Omit<Job, 'score' | 'matchedKeywords' | 'scoreReasons' | 'status'>[]>;
}
```

## Normalization & Quality Requirements
1. **Deterministic Unique ID**: Must be formatted as `${source}:${externalId}` (e.g., `remoteok:123456`, `wwr:backend-dev-abc`).
2. **Plaintext Descriptions**: Strip all raw HTML tags, entity-decode HTML characters, and trim excess whitespace.
3. **Canonical Dates**:
   - `postedAt`: Parse source publish date or fallback to current date if missing.
   - `expiresAt`: Set if provided by source or infer if a window is known; else `null`.
   - `fetchedAt`: Timestamp when the adapter fetched the record (`new Date()`).
4. **Standard User-Agent**: Every adapter must send an identifiable, polite User-Agent header (no aggressive polling; runs 2–3 times a day).
5. **Resilience**: Network errors or individual job parsing failures must be caught gracefully and logged, returning successfully parsed jobs rather than crashing the entire pipeline.
