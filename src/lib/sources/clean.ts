import { compile } from 'html-to-text';

const htmlConverter = compile({
  wordwrap: false,
  selectors: [
    { selector: 'a', options: { ignoreHref: true } },
    { selector: 'img', format: 'skip' },
  ],
});

/**
 * Strips HTML tags, decodes entities, preserves list items as lines,
 * and limits output to max 20,000 characters.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  const text = htmlConverter(html).trim();
  return text.length > 20000 ? text.slice(0, 20000) : text;
}

/**
 * Strips flag emojis (Unicode Regional Indicator symbol pairs and subdivisions).
 */
export function stripFlagEmoji(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/[\u{1F3F4}][\u{E0060}-\u{E007F}]+[\u{E007F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses country lists with flag emojis and Oxford "and" conjunctions.
 * E.g. "🇦🇩 Andorra, 🇦🇱 Albania, and 🇿🇦 South Africa" -> ["Andorra", "Albania", "South Africa"]
 */
export function parseCountryList(input: string | null | undefined): string[] {
  if (!input) return [];
  const cleaned = stripFlagEmoji(input);
  if (!cleaned) return [];

  const parts = cleaned.split(',');
  const countries: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim().replace(/^and\s+/i, '').trim();
    if (!trimmed) continue;

    if (trimmed.includes(' and ')) {
      const subParts = trimmed.split(/\s+and\s+/i);
      for (const sub of subParts) {
        const subTrimmed = sub.trim();
        if (subTrimmed) countries.push(subTrimmed);
      }
    } else {
      countries.push(trimmed);
    }
  }

  return countries;
}

/**
 * Safely parses various date formats (ISO string, RFC 822, UNIX epoch seconds or ms).
 * Returns null if invalid or cannot be parsed.
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    // If under 100 billion, it is UNIX seconds (e.g. 1728564000)
    const ms = value < 100_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Check if purely numeric string
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      const ms = num < 100_000_000_000 ? num * 1000 : num;
      const date = new Date(ms);
      return isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}
