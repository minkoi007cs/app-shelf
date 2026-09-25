import { describe, it, expect } from 'vitest';
import { newId, slugifyId } from './ids';

describe('ids utility', () => {
  describe('slugifyId', () => {
    it('slugifies standard tool name correctly', () => {
      expect(slugifyId('Claude Code')).toBe('claude-code');
    });

    it('sanitizes malicious injection payload like x",y', () => {
      const slug = slugifyId('x",y');
      expect(slug).toBe('xy');
      expect(slug).toMatch(/^[a-z0-9-]*$/);
    });

    it('collapses multiple whitespace characters', () => {
      expect(slugifyId('  Multi   Space  ')).toBe('multi-space');
    });

    it('returns empty string for non-alphanumeric punctuation', () => {
      expect(slugifyId('!!!')).toBe('');
    });
  });

  describe('newId', () => {
    it('produces 1000 distinct values with specified prefix', () => {
      const set = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        set.add(newId('pay'));
      }
      expect(set.size).toBe(1000);
    });

    it('matches prefix and UUID structure', () => {
      const id = newId('pay');
      expect(id).toMatch(/^pay-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});
