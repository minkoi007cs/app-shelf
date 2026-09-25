/**
 * Pure sync policy rules to prevent silent data loss and unnecessary writes.
 */

export function shouldSync(loadState: 'loading' | 'ready' | 'failed'): boolean {
  return loadState === 'ready';
}

export function removedIds<T extends { id: string }>(before: T[], after: T[]): string[] {
  const afterIds = new Set(after.map(item => item.id));
  return before.filter(item => !afterIds.has(item.id)).map(item => item.id);
}

export function changedRows<T extends { id: string }>(prev: T[], next: T[]): T[] {
  const prevMap = new Map(prev.map(item => [item.id, JSON.stringify(item, Object.keys(item).sort())]));
  const changed: T[] = [];

  for (const item of next) {
    const serialized = JSON.stringify(item, Object.keys(item).sort());
    const existing = prevMap.get(item.id);
    if (!existing || existing !== serialized) {
      changed.push(item);
    }
  }

  return changed;
}

export function planSync<T extends { id: string }>(
  prev: T[],
  next: T[]
): { upsert: T[]; deleteIds: string[] } {
  return {
    upsert: changedRows(prev, next),
    deleteIds: removedIds(prev, next),
  };
}
