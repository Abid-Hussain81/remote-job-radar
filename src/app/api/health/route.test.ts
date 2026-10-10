import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  const originalUri = process.env.MONGODB_URI;

  beforeEach(() => {
    delete process.env.MONGODB_URI;
  });

  it('returns status 500 with descriptive error when MONGODB_URI is missing', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Missing MONGODB_URI');
  });

  // Restore env after tests
  process.env.MONGODB_URI = originalUri;
});
