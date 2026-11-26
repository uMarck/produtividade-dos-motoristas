import { useState, type FormEvent, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BarChart3, Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { table, type CheckerRank, type Entry } from './checkerData';
import './conferentes.css';

const format = new Intl.NumberFormat('pt-BR');

type Props = {
  db: SupabaseClient; owner: string; date: string; view: 'day' | 'month';
  entries: Entry[]; ranking: CheckerRank[]; loading: boolean; error: string;
  reload: () => void; chart: ReactNode;
};

export default function Conferentes({ db, owner, date, view, entries, ranking, loading, error, reload, chart }: Props) {
  const [name, setName] = useState('');
  const [count, setCount] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const total = ranking.reduce((sum, entry) => sum + entry.count, 0);

  function resetForm() {
    setName('');
    setCount('');
    setEditing(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const quantity = Number(count);
    if (!normalizedName || !count || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999999 || !date || view !== 'day' || busy) return;
    setBusy(true);
    try {
      const values = { name: normalizedName, count: quantity };
      const rows = db.from(table);
      let result = editing
        ? await rows.update(values).eq('id', editing).eq('owner_id', owner).eq('deleted', false).select('id').maybeSingle()
        : await rows.insert({ ...values, owner_id: owner, date }).select('id').maybeSingle();
      if (!editing && result.error?.code === '23505') {
        result = await db.from(table).update({ ...values, deleted: false }).eq('owner_id', owner)
          .eq('date', date).eq('name_key', normalizedName.toLowerCase()).eq('deleted', true).select('id').maybeSingle();
        if (!result.error && !result.data) {
          setMessage('Este conferente já tem um lançamento no dia. Use Editar.');
          return;
        }
      }
      if (result.error || !result.data) {
        setMessage(result.error?.code === '23505' ? 'Já existe um lançamento com esse nome no dia.' : 'Não foi possível salvar no Supabase. Tente novamente.');
        return;
      }
      setMessage(editing ? 'Lançamento atualizado.' : 'Conferência registrada.');
      resetForm();
      reload();
    } catch {
      setMessage('Não foi possível salvar no Supabase. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: Entry) {
    if (busy || !window.confirm(`Excluir a conferência de ${entry.name} nesta data?`)) return;
    setBusy(true);
    try {
      const { error: deleteError } = await db.from(table).update({ deleted: true }).eq('id', entry.id)
        .eq('owner_id', owner).eq('deleted', false).select('id').single();
      if (deleteError) throw deleteError;
      setMessage('Lançamento excluído.');
      if (editing === entry.id) resetForm();
      reload();
    } catch {
      setMessage('Não foi possível remover o lançamento. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return <section id="conferentes" className="panel checker-panel" aria-labelledby="checker-title">
    <div className="panel-heading">
      <div className="panel-title"><Trophy size={19} /><h2 id="checker-title">PRODUTIVIDADE POR CONFERENTES</h2></div>
      <strong>{format.format(total)} contêineres</strong>
    </div>
    <div className="checker-body">
      {error && <p role="alert" data-html2canvas-ignore="true">{error} <button type="button" className="btn checker-button" onClick={reload}>RECARREGAR</button></p>}
      {view === 'day' && <form className="checker-form" onSubmit={submit} data-html2canvas-ignore="true">
        <label className="form-field"><span>CONFERENTE</span><input id="checker-name" value={name} onChange={event => setName(event.target.value)} maxLength={120} required /></label>
        <label className="form-field"><span>CONTÊINERES CONFERIDOS</span><input type="number" min="0" max="999999" step="1" value={count} onChange={event => setCount(event.target.value)} required /></label>
        <button className="btn checker-button" disabled={!date || busy || loading}><Plus size={16} /> {editing ? 'SALVAR ALTERAÇÃO' : 'REGISTRAR'}</button>
        {editing && <button type="button" className="btn btn-modal-quiet" onClick={resetForm}>CANCELAR</button>}
      </form>}
      {message && <p className="checker-note" role="status" data-html2canvas-ignore="true">{message}</p>}
      {loading ? <p className="checker-empty">Carregando conferentes…</p> : ranking.length ? <div className="checker-grid">
        <div>
          <h3><BarChart3 size={15} /> Puxadas por conferente · Top 12</h3>
          {chart}
        </div>
        <div>
          <h3><Trophy size={15} /> Ranking de conferentes</h3>
          <ol className="checker-ranking">
            {ranking.map((entry, index) => {
              const daily = view === 'day' ? entries.find(row => row.name === entry.name) : undefined;
              return <li key={entry.name}>
                <span className="checker-position">{index + 1}</span>
                <strong>{entry.name}</strong><b>{format.format(entry.count)}</b>
                {daily && <div className="checker-actions" data-html2canvas-ignore="true">
                  <button type="button" disabled={busy} aria-label={`Editar conferência de ${entry.name}`} onClick={() => {
                    setEditing(daily.id);
                    setName(entry.name);
                    setCount(String(entry.count));
                    setMessage('');
                    document.getElementById('checker-name')?.focus();
                  }}><Pencil size={15} /></button>
                  <button type="button" disabled={busy} aria-label={`Excluir conferência de ${entry.name}`} onClick={() => void remove(daily)}><Trash2 size={15} /></button>
                </div>}
              </li>;
            })}
          </ol>
        </div>
      </div> : !error && <p className="checker-empty">Nenhuma conferência registrada neste período.</p>}
    </div>
  </section>;
}
