import { describe, it, expect } from 'vitest';
import {
  htmlToText,
  stripFlagEmoji,
  parseCountryList,
  toDate,
} from './clean';

describe('src/lib/sources/clean', () => {
  describe('htmlToText', () => {
    it('strips HTML tags and decodes entities', () => {
      const html = '<p>Hello &amp; welcome to <strong>Next.js</strong>!</p>';
      expect(htmlToText(html)).toBe('Hello & welcome to Next.js!');
    });

    it('keeps list items as separate lines', () => {
      const html = '<ul><li>TypeScript</li><li>Vitest</li><li>Mongoose</li></ul>';
      const text = htmlToText(html);
      expect(text).toContain('TypeScript');
      expect(text).toContain('Vitest');
      expect(text).toContain('Mongoose');
    });

    it('collapses whitespace and caps at 20,000 chars', () => {
      const longHtml = '<p>' + 'a'.repeat(25000) + '</p>';
      const text = htmlToText(longHtml);
      expect(text.length).toBeLessThanOrEqual(20000);
    });

    it('returns empty string for null or undefined', () => {
      expect(htmlToText(null)).toBe('');
      expect(htmlToText(undefined)).toBe('');
    });
  });

  describe('stripFlagEmoji', () => {
    it('removes flag emojis correctly', () => {
      const input = '🇦🇩 Andorra, 🇦🇱 Albania, and 🇿🇦 South Africa';
      const output = stripFlagEmoji(input);
      expect(output).toBe('Andorra, Albania, and South Africa');
    });
  });

  describe('parseCountryList', () => {
    it('parses comma-separated country list with flags and Oxford and', () => {
      const input = '🇦🇩 Andorra, 🇦🇱 Albania, and 🇿🇦 South Africa';
      const result = parseCountryList(input);
      expect(result).toEqual(['Andorra', 'Albania', 'South Africa']);
    });

    it('handles single country with flag', () => {
      const input = '🇺🇸 United States';
      expect(parseCountryList(input)).toEqual(['United States']);
    });

    it('handles two countries joined with and', () => {
      const input = 'Spain and France';
      expect(parseCountryList(input)).toEqual(['Spain', 'France']);
    });

    it('returns empty array for empty input', () => {
      expect(parseCountryList('')).toEqual([]);
      expect(parseCountryList(null)).toEqual([]);
    });
  });

  describe('toDate', () => {
    it('parses ISO date strings', () => {
      const date = toDate('2026-10-10T12:00:00Z');
      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString()).toBe('2026-10-10T12:00:00.000Z');
    });

    it('parses UNIX epoch seconds (number)', () => {
      const date = toDate(1791633600);
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2026);
    });

    it('parses numeric epoch strings', () => {
      const date = toDate('1791633600');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2026);
    });

    it('returns null for invalid values', () => {
      expect(toDate('invalid-date')).toBeNull();
      expect(toDate(null)).toBeNull();
    });
  });
});
