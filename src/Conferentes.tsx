import { useEffect, useState, type FormEvent } from 'react';
import { BarChart3, Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import './conferentes.css';

type Entry = { date: string; name: string; count: number };
const storageKey = 'alencar-conferentes-v1';
const format = new Intl.NumberFormat('pt-BR');
const nameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

function readEntries(): Entry[] {
  const entries = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  if (!Array.isArray(entries)) throw new Error('Invalid entries');
  return entries;
}

export default function Conferentes({ date, view }: { date: string; view: 'day' | 'month' }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState('');
  const [count, setCount] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    function refresh(event?: StorageEvent) {
      if (event && event.key !== storageKey && event.key !== null) return;
      try {
        setEntries(readEntries());
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    }
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const period = view === 'month' ? date.slice(0, 7) : date;
  const grouped = new Map<string, Entry>();
  for (const entry of entries) {
    if (!period || !entry.date.startsWith(period)) continue;
    const key = nameKey(entry.name);
    const previous = grouped.get(key);
    grouped.set(key, { ...entry, count: entry.count + (previous?.count ?? 0) });
  }
  const ranking = [...grouped.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
  const total = ranking.reduce((sum, entry) => sum + entry.count, 0);

  function resetForm() {
    setName('');
    setCount('');
    setEditing(null);
  }

  function changeEntries(update: (current: Entry[]) => Entry[], success: string) {
    try {
      const next = update(readEntries());
      localStorage.setItem(storageKey, JSON.stringify(next));
      setEntries(next);
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'duplicate'
        ? 'Este conferente já tem um lançamento no dia. Use Editar.'
        : 'Não foi possível gravar neste navegador.');
      return false;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const quantity = Number(count);
    if (!normalizedName || !count || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999999 || !date || view !== 'day') return;
    const saved = changeEntries(current => {
      const next = current.filter(entry => entry.date !== date || nameKey(entry.name) !== editing);
      if (next.some(entry => entry.date === date && nameKey(entry.name) === nameKey(normalizedName))) throw new Error('duplicate');
      return [...next, { date, name: normalizedName, count: quantity }];
    }, editing ? 'Lançamento atualizado.' : 'Conferência registrada.');
    if (saved) resetForm();
  }

  function remove(entry: Entry) {
    if (!window.confirm(`Excluir a conferência de ${entry.name} nesta data?`)) return;
    if (changeEntries(current => current.filter(row => row.date !== date || nameKey(row.name) !== nameKey(entry.name)), 'Lançamento excluído.')
      && editing === nameKey(entry.name)) resetForm();
  }

  return <section id="conferentes" className="panel checker-panel" aria-labelledby="checker-title" data-html2canvas-ignore="true">
    <div className="panel-heading">
      <div className="panel-title"><Trophy size={19} /><h2 id="checker-title">PRODUTIVIDADE POR CONFERENTES</h2></div>
      <strong>{format.format(total)} contêineres</strong>
    </div>
    <div className="checker-body">
      <p className="checker-note">Dados salvos neste navegador. {view === 'month' && 'Selecione DIA para lançar ou editar.'}</p>
      {storageError && <p role="alert">Não foi possível ler os lançamentos salvos neste navegador.</p>}
      {view === 'day' && <form className="checker-form" onSubmit={submit}>
        <label className="form-field"><span>CONFERENTE</span><input id="checker-name" value={name} onChange={event => setName(event.target.value)} maxLength={120} required /></label>
        <label className="form-field"><span>CONTÊINERES CONFERIDOS</span><input type="number" min="0" max="999999" step="1" value={count} onChange={event => setCount(event.target.value)} required /></label>
        <button className="btn checker-button" disabled={!date || storageError}><Plus size={16} /> {editing ? 'SALVAR ALTERAÇÃO' : 'REGISTRAR'}</button>
        {editing && <button type="button" className="btn btn-modal-quiet" onClick={resetForm}>CANCELAR</button>}
      </form>}
      {message && <p className="checker-note" role="status">{message}</p>}
      {ranking.length ? <div className="checker-grid">
        <div>
          <h3><Trophy size={15} /> Ranking</h3>
          <ol className="checker-ranking">
            {ranking.map((entry, index) => <li key={nameKey(entry.name)}>
              <span className="checker-position">{index + 1}</span>
              <strong>{entry.name}</strong><b>{format.format(entry.count)}</b>
              {view === 'day' && <div className="checker-actions">
                <button type="button" aria-label={`Editar conferência de ${entry.name}`} onClick={() => {
                  setEditing(nameKey(entry.name));
                  setName(entry.name);
                  setCount(String(entry.count));
                  setMessage('');
                  document.getElementById('checker-name')?.focus();
                }}><Pencil size={15} /></button>
                <button type="button" aria-label={`Excluir conferência de ${entry.name}`} onClick={() => remove(entry)}><Trash2 size={15} /></button>
              </div>}
            </li>)}
          </ol>
        </div>
        <div>
          <h3><BarChart3 size={15} /> Contêineres conferidos · Top 10</h3>
          <ul className="checker-chart" aria-label="Gráfico de barras de contêineres conferidos">
            {ranking.slice(0, 10).map(entry => <li key={nameKey(entry.name)}>
              <div><span>{entry.name}</span><b>{format.format(entry.count)}</b></div>
              <div className="checker-track" aria-hidden="true"><i style={{ width: `${100 * entry.count / Math.max(1, ranking[0].count)}%` }} /></div>
            </li>)}
          </ul>
        </div>
      </div> : <p className="checker-empty">Nenhuma conferência registrada neste período.</p>}
    </div>
  </section>;
}
