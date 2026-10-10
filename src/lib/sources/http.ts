const USER_AGENT = 'remote-job-radar/0.1 (personal job feed)';
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export interface HttpOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a network fetch with timeout, polite headers, and retries with backoff.
 */
async function fetchWithRetry(
  url: string,
  options: HttpOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = MAX_RETRIES,
    headers: customHeaders,
    ...restOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        ...restOptions,
        signal: controller.signal,
        credentials: 'omit',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json, text/xml, application/xml, text/plain, */*',
          ...customHeaders,
        },
      });

      if (!response.ok) {
        let errorSnippet = '';
        try {
          const bodyText = await response.text();
          errorSnippet = bodyText.slice(0, 300);
        } catch {
          // ignore error body read failure
        }
        throw new Error(
          `HTTP ${response.status} (${response.statusText}) from ${url}${
            errorSnippet ? `: ${errorSnippet}` : ''
          }`
        );
      }

      return response;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // If we still have retries remaining, wait with backoff before next attempt
      if (attempt < retries) {
        const backoffMs = 500 * Math.pow(2, attempt); // 500ms, 1000ms
        await sleep(backoffMs);
      }
    } finally {
      clearTimeout(timeoutTimer);
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

/**
 * Fetches raw text decoded as UTF-8.
 */
export async function fetchText(
  url: string,
  options?: HttpOptions
): Promise<string> {
  const response = await fetchWithRetry(url, options);
  return await response.text();
}

/**
 * Fetches and parses JSON payload.
 */
export async function fetchJson<T>(
  url: string,
  options?: HttpOptions
): Promise<T> {
  const response = await fetchWithRetry(url, options);
  return (await response.json()) as T;
}
