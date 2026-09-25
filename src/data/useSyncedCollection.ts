import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { shouldSync, planSync } from './syncPolicy';

interface UseSyncedCollectionOptions<T, R> {
  table: string;
  rowToItem: (row: R) => T;
  itemToRow: (item: T) => R;
  seed?: T[] | ((loaded: T[]) => T[]);
}

export function useSyncedCollection<T extends { id: string }, R extends Record<string, any>>({
  table,
  rowToItem,
  itemToRow,
  seed = [],
}: UseSyncedCollectionOptions<T, R>) {
  const [items, setItems] = useState<T[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [error, setError] = useState<string | null>(null);

  const snapshotRef = useRef<T[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef<boolean>(false);

  // Load once on mount
  useEffect(() => {
    let isMounted = true;
    setLoadState('loading');

    async function load() {
      try {
        const { data, error: fetchErr } = await supabase.from(table).select('*');
        if (!isMounted) return;

        if (fetchErr) {
          setError(fetchErr.message);
          setLoadState('failed');
          return;
        }

        const loadedItems = ((data || []) as R[]).map((r) => rowToItem(r));
        const finalItems = typeof seed === 'function' ? seed(loadedItems) : (loadedItems.length > 0 ? loadedItems : seed);

        snapshotRef.current = finalItems;
        setItems(finalItems);
        setLoadState('ready');
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'Failed to load');
        setLoadState('failed');
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [table]);

  // Sync on items state change
  useEffect(() => {
    if (!shouldSync(loadState)) return;

    const plan = planSync(snapshotRef.current, items);
    if (plan.upsert.length === 0 && plan.deleteIds.length === 0) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        if (plan.deleteIds.length > 0) {
          const { error: delErr } = await supabase.from(table).delete().in('id', plan.deleteIds);
          if (delErr) throw delErr;
        }

        if (plan.upsert.length > 0) {
          const rowsToUpsert = plan.upsert.map(itemToRow);
          const { error: upErr } = await supabase.from(table).upsert(rowsToUpsert as any);
          if (upErr) throw upErr;
        }

        snapshotRef.current = items;
        setError(null);
      } catch (err: any) {
        console.error(`Sync error on table ${table}:`, err);
        setError(err?.message || 'Sync failed');
      } finally {
        isSyncingRef.current = false;
      }
    }, 500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [items, loadState, table]);

  return { items, setItems, loadState, error };
}
