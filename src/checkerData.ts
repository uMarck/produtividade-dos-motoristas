import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Entry = { id: string; date: string; name: string; count: number };
export type CheckerRank = { name: string; count: number };
export const table = 'alencar_checker_productivity';
const localKey = 'alencar-conferentes-v1';

export function rankCheckers(entries: Entry[]) {
  const grouped = new Map<string, CheckerRank>();
  for (const { name, count } of entries) {
    const key = name.toLocaleLowerCase('pt-BR');
    const previous = grouped.get(key);
    grouped.set(key, { name: previous?.name ?? name, count: count + (previous?.count ?? 0) });
  }
  return [...grouped.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
}

async function migrateLocal(db: SupabaseClient, owner: string, signal: AbortSignal) {
  let raw: string | null;
  try { raw = localStorage.getItem(localKey); } catch { return; }
  if (!raw) return;
  const entries: Omit<Entry, 'id'>[] = JSON.parse(raw);
  if (!Array.isArray(entries)) throw new Error('Formato local inválido');
  if (entries.length) {
    const { error } = await db.from(table)
      .upsert(entries.map(({ date, name, count }) => ({ owner_id: owner, date, name, count })), {
        onConflict: 'owner_id,date,name_key',
        ignoreDuplicates: true,
      }).abortSignal(signal);
    if (error) throw error;
  }
  // Keep a backup until the import succeeds. An older open tab may still update the original key.
  if (!signal.aborted && localStorage.getItem(localKey) === raw) {
    localStorage.setItem(localKey + '-backup', raw);
    localStorage.removeItem(localKey);
  }
}

export function useCheckerData(db: SupabaseClient, owner: string | undefined, date: string, view: 'day' | 'month') {
  const period = view === 'day' ? date : date.slice(0, 7);
  const key = owner && period ? owner + '/' + period : '';
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ key: '', revision: 0, entries: [] as Entry[], error: '' });

  useEffect(() => {
    if (!key || !owner) return;
    const controller = new AbortController();
    const signal = controller.signal;

    async function load(userId: string) {
      let error = '';
      try { await migrateLocal(db, userId, signal); }
      catch { error = 'Falha ao transferir os lançamentos deste navegador. Use Recarregar para tentar novamente.'; }
      const entries: Entry[] = [];
      try {
        for (let offset = 0; ; offset += 500) {
          const query = db.from(table).select('id,date,name,count').eq('owner_id', userId).eq('deleted', false)
            .order('date').order('id').range(offset, offset + 499).abortSignal(signal);
          const start = period + '-01';
          const end = new Date(start + 'T00:00:00Z');
          const response = view === 'day' ? await query.eq('date', period)
            : await query.gte('date', start).lt('date', new Date(end.setUTCMonth(end.getUTCMonth() + 1)).toISOString().slice(0, 10));
          if (response.error) throw response.error;
          entries.push(...response.data);
          if (response.data.length < 500) break;
        }
      } catch {
        error ||= 'Não foi possível carregar os lançamentos de conferentes.';
        entries.length = 0;
      }
      if (!signal.aborted) setResult({ key, revision, entries, error });
    }

    void load(owner);
    return () => controller.abort();
  }, [db, key, owner, period, revision, view]);

  const current = result.key === key;
  return {
    entries: current ? result.entries : [],
    error: current ? result.error : '',
    loading: Boolean(key && (!current || result.revision !== revision)),
    reload: () => setRevision(n => n + 1),
  };
}
