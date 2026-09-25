import { describe, it, expect } from 'vitest';
import { shouldSync, removedIds, changedRows, planSync } from './syncPolicy';

describe('syncPolicy', () => {
  describe('shouldSync', () => {
    it('returns false for loading and failed states', () => {
      expect(shouldSync('loading')).toBe(false);
      expect(shouldSync('failed')).toBe(false);
    });

    it('returns true for ready state', () => {
      expect(shouldSync('ready')).toBe(true);
    });
  });

  describe('removedIds', () => {
    it('returns empty array when nothing was removed', () => {
      const before = [{ id: 'a' }, { id: 'b' }];
      const after = [{ id: 'a' }, { id: 'b' }];
      expect(removedIds(before, after)).toEqual([]);
    });

    it('identifies removed item IDs correctly', () => {
      const before = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const after = [{ id: 'a' }, { id: 'c' }];
      expect(removedIds(before, after)).toEqual(['b']);
    });
  });

  describe('changedRows', () => {
    it('detects modified rows', () => {
      const prev = [{ id: '1', title: 'A' }];
      const next = [{ id: '1', title: 'B' }];
      expect(changedRows(prev, next)).toEqual([{ id: '1', title: 'B' }]);
    });
  });

  describe('planSync', () => {
    it('returns empty plan when arrays are identical', () => {
      const list = [{ id: '1', title: 'Task' }];
      const plan = planSync(list, list);
      expect(plan.upsert).toEqual([]);
      expect(plan.deleteIds).toEqual([]);
    });

    it('identifies modified rows for upsert', () => {
      const prev = [{ id: '1', title: 'Old' }];
      const next = [{ id: '1', title: 'New' }];
      const plan = planSync(prev, next);
      expect(plan.upsert).toEqual([{ id: '1', title: 'New' }]);
      expect(plan.deleteIds).toEqual([]);
    });
  });
});
