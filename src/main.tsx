import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  CalendarDays,
  Clock3,
  FileImage,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  Trophy,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './styles.css';
import './mobile-tweaks.css';

type DriverRecord = {
  id: number | string;
  report_date: string;
  driver_name: string;
  whole_legs: number;
  half_legs: number;
  operation_time: string;
  base_arrival: string;
  base_departure: string;
  activity_end: string;
};

type DriverForm = {
  driverName: string;
  wholeLegs: string;
  halfLegs: string;
  baseArrival: string;
  baseDeparture: string;
  activityEnd: string;
};

const blankForm: DriverForm = {
  driverName: '',
  wholeLegs: '0',
  halfLegs: '0',
  baseArrival: '',
  baseDeparture: '',
  activityEnd: '',
};

function localDateValue(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function legs(record: DriverRecord) {
  return Number(record.whole_legs) + Number(record.half_legs);
}

function durationMinutes(start: string, end: string) {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return 0;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return (endTotal - startTotal + 1440) % 1440;
}

function operationHours(start: string, end: string) {
  return durationMinutes(start, end) / 60;
}

function operationDuration(start: string, end: string) {
  const elapsed = durationMinutes(start, end);
  return `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
}

function hourlyAverage(record: DriverRecord) {
  const hours = operationHours(record.base_departure, record.activity_end);
  return hours > 0 ? legs(record) / hours : 0;
}

function number(value: number, digits = 0) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function percentage(value: number, total: number) {
  return `${number(total ? (value / total) * 100 : 0, 1)}%`;
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', options).format(new Date(`${value}T12:00:00`));
}

function fileSlug(date: string) {
  return date.replaceAll('-', '');
}

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return body.error || 'Não foi possível concluir a operação.';
  } catch {
    return 'Não foi possível concluir a operação.';
  }
}

function App() {
  const [selectedDate, setSelectedDate] = useState(localDateValue());
  const [records, setRecords] = useState<DriverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState<DriverForm>(blankForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState('');
  const [exportAllRecords, setExportAllRecords] = useState(false);
  const exportRef = useRef<HTMLElement | null>(null);

  async function loadRecords(date = selectedDate) {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/productivity?date=${encodeURIComponent(date)}`);
      if (!response.ok) throw new Error(await responseError(response));
      setRecords(await response.json());
    } catch (error) {
      setRecords([]);
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os dados do dia.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords(selectedDate);
    // Intentionally run only when the selected report date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => legs(b) - legs(a) || a.driver_name.localeCompare(b.driver_name, 'pt-BR')),
    [records],
  );
  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('pt-BR');
    return sortedRecords.filter((record) => record.driver_name.toLocaleLowerCase('pt-BR').includes(query));
  }, [searchTerm, sortedRecords]);
  const tableRecords = exportAllRecords ? sortedRecords : filteredRecords;
  const totals = useMemo(() => records.reduce(
    (sum, record) => ({ whole: sum.whole + Number(record.whole_legs), half: sum.half + Number(record.half_legs) }),
    { whole: 0, half: 0 },
  ), [records]);
  const totalLegs = totals.whole + totals.half;
  const monthLabel = selectedDate ? dateLabel(selectedDate, { month: 'long', year: 'numeric' }).toLocaleUpperCase('pt-BR') : '';
  const longDate = selectedDate ? dateLabel(selectedDate, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';

  function startNew() {
    setEditingId(null);
    setForm(blankForm);
    setFormOpen(true);
  }

  function startEdit(record: DriverRecord) {
    setEditingId(record.id);
    setForm({
      driverName: record.driver_name,
      wholeLegs: String(record.whole_legs),
      halfLegs: String(record.half_legs),
      baseArrival: record.base_arrival || '',
      baseDeparture: record.base_departure,
      activityEnd: record.activity_end,
    });
    setFormOpen(true);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      reportDate: selectedDate,
      driverName: form.driverName.trim(),
      wholeLegs: Number(form.wholeLegs),
      halfLegs: Number(form.halfLegs),
      baseArrival: form.baseArrival,
      baseDeparture: form.baseDeparture,
      activityEnd: form.activityEnd,
    };
    if (!payload.driverName) return setToast('Informe o nome do motorista.');
    if (!Number.isInteger(payload.wholeLegs) || payload.wholeLegs < 0 || !Number.isInteger(payload.halfLegs) || payload.halfLegs < 0) {
      return setToast('As quantidades devem ser números inteiros iguais ou maiores que zero.');
    }
    if ((editingId === null || payload.baseArrival !== '') && !/^\d{2}:\d{2}$/.test(payload.baseArrival)) {
      return setToast('Informe o horário de entrada na base.');
    }
    if (!/^\d{2}:\d{2}$/.test(payload.baseDeparture) || !/^\d{2}:\d{2}$/.test(payload.activityEnd)) {
      return setToast('Informe a saída da base e o encerramento da operação.');
    }
    setSaving(true);
    try {
      const url = editingId === null ? '/api/productivity' : `/api/productivity/${editingId}`;
      const response = await fetch(url, {
        method: editingId === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setFormOpen(false);
      setToast(editingId === null ? 'Produtividade registrada.' : 'Lançamento atualizado.');
      await loadRecords(selectedDate);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível salvar os dados.');
    } finally {
      setSaving(false);
    }
  }

  async function removeRecord(record: DriverRecord) {
    if (!window.confirm(`Excluir o lançamento de ${record.driver_name} em ${dateLabel(selectedDate, { dateStyle: 'short' })}?`)) return;
    try {
      const response = await fetch(`/api/productivity/${record.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) throw new Error(await responseError(response));
      setToast('Lançamento removido.');
      await loadRecords(selectedDate);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível excluir o lançamento.');
    }
  }

  async function exportExcel() {
    try {
      const response = await fetch(`/api/productivity/export?date=${encodeURIComponent(selectedDate)}`);
      if (!response.ok) throw new Error(await responseError(response));
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `alencar-produtividade-${fileSlug(selectedDate)}.xlsx`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setToast('Planilha Excel exportada com a identidade da empresa.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível exportar o Excel.');
    }
  }

  async function captureDashboard() {
    if (!exportRef.current) throw new Error('O painel ainda está carregando.');
    setExportAllRecords(true);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    document.body.classList.add('exporting');
    try {
      const html2canvas = (await import('html2canvas')).default;
      await document.fonts.ready;
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      return await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#061733',
        logging: false,
        windowWidth: 1480,
        windowHeight: Math.max(document.documentElement.scrollHeight, 1100),
      });
    } finally {
      document.body.classList.remove('exporting');
      setExportAllRecords(false);
    }
  }

  async function exportJpeg() {
    try {
      const canvas = await captureDashboard();
      const link = document.createElement('a');
      link.download = `alencar-produtividade-${fileSlug(selectedDate)}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.94);
      link.click();
      setToast('Imagem JPEG exportada.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível exportar a imagem.');
    }
  }

  async function exportPdf() {
    try {
      const { jsPDF } = await import('jspdf');
      const canvas = await captureDashboard();
      const image = canvas.toDataURL('image/jpeg', 0.94);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      const pages = Math.max(1, Math.ceil(imageHeight / pageHeight));
      for (let page = 0; page < pages; page += 1) {
        if (page > 0) pdf.addPage();
        pdf.addImage(image, 'JPEG', 0, -page * pageHeight, pageWidth, imageHeight, undefined, 'FAST');
      }
      pdf.save(`alencar-produtividade-${fileSlug(selectedDate)}.pdf`);
      setToast('Relatório PDF exportado.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Não foi possível exportar o PDF.');
    }
  }

  return (
    <main className="app-shell" ref={exportRef}>
      <div className="dashboard-wrap">
        <header className="masthead">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true"><span>A</span><span>L</span><i /></div>
            <div className="brand-name"><span className="brand-overline">GRUPO</span><strong>ALENCAR</strong><em>LOG</em></div>
            <span className="brand-divider" />
            <div className="truck-emblem"><Truck size={31} strokeWidth={2.2} /></div>
          </div>
          <div className="page-title">
            <span className="eyebrow">PAINEL OPERACIONAL <b>•</b> MOVIMENTAÇÃO DIÁRIA</span>
            <h1>PRODUTIVIDADE <span>DE MOTORISTAS</span></h1>
            <p>Mais eficiência. Cada movimento conta.</p>
          </div>
          <div className="header-meta">
            <div className="date-display">
              <CalendarDays className="meta-icon" size={27} />
              <div><span>MÊS DE REFERÊNCIA</span><strong>{monthLabel || '—'}</strong><small>DATA: {dateLabel(selectedDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}</small></div>
            </div>
            <div className="daily-total"><span>TOTAL GERAL</span><strong>{number(totalLegs)}</strong><small>MOVIMENTOS</small></div>
          </div>
        </header>

        <section className="toolbar" aria-label="Controles do relatório">
          <div className="reference-control">
            <label htmlFor="reference-date">DATA DE REFERÊNCIA</label>
            <div className="date-input-wrap"><CalendarDays size={17} /><input id="reference-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div>
          </div>
          <p className="date-caption">{longDate ? longDate.charAt(0).toLocaleUpperCase('pt-BR') + longDate.slice(1) : 'Selecione a data do relatório'}</p>
          <div className="toolbar-actions">
            <button className="btn btn-outline" onClick={exportExcel} disabled={!records.length} title="Baixar dados e resumo em Excel"><FileSpreadsheet size={16} /> EXPORTAR EXCEL</button>
            <button className="btn btn-outline" onClick={exportPdf} disabled={!records.length} title="Baixar painel em PDF"><FileText size={16} /> EXPORTAR PDF</button>
            <button className="btn btn-outline" onClick={exportJpeg} disabled={!records.length} title="Baixar painel como imagem JPEG"><FileImage size={16} /> EXPORTAR JPEG</button>
            <button className="btn btn-primary" onClick={startNew}><Plus size={17} /> NOVO REGISTRO</button>
          </div>
        </section>

        {loadError && <div className="error-banner"><span>{loadError}</span><button onClick={() => void loadRecords()}><span>RECARREGAR</span></button></div>}

        <section className="metric-grid" aria-label="Totais da demanda do dia">
          <MetricCard icon={Truck} title="PERNA INTEIRA" total={totals.whole} share={percentage(totals.whole, totalLegs)} tone="lime" description="movimentos · demanda do dia" />
          <MetricCard icon={Truck} title="MEIA PERNA" total={totals.half} share={percentage(totals.half, totalLegs)} tone="cyan" description="movimentos · demanda do dia" />
          <MetricCard icon={BarChart3} title="TOTAL GERAL" total={totalLegs} share={percentage(totalLegs, totalLegs)} tone="white" description="pernas movimentadas no dia" />
        </section>

        <section className="dashboard-grid" aria-label="Painel de produtividade">
          <div className="analytics-column">
            <Panel title="PRODUTIVIDADE POR MOTORISTA" icon={BarChart3} className="bar-panel">
              <div className="chart-legend"><span><i className="legend-dot lime" /> Perna inteira</span><span><i className="legend-dot cyan" /> Meia perna</span></div>
              {loading ? <ChartLoading /> : sortedRecords.length ? <BarChart records={sortedRecords.slice(0, 12)} /> : <EmptyChart text="Os movimentos aparecerão aqui após os primeiros lançamentos." />}
            </Panel>
            <div className="lower-grid">
              <Panel title="DISTRIBUIÇÃO DA DEMANDA" icon={BarChart3} className="donut-panel">
                <DonutChart whole={totals.whole} half={totals.half} total={totalLegs} />
              </Panel>
              <Panel title="TOP 10 MOTORISTAS" icon={Trophy} className="ranking-panel">
                {loading ? <ChartLoading /> : sortedRecords.length ? <Ranking records={sortedRecords.slice(0, 10)} /> : <EmptyChart text="Seu ranking diário começa com os registros de hoje." />}
              </Panel>
            </div>
          </div>

          <section className="panel roster-panel">
            <div className="panel-heading roster-heading">
              <div className="panel-title"><span className="panel-icon"><Truck size={19} /></span><h2>PRODUTIVIDADE DE MOTORISTAS</h2></div>
              <span className="roster-count">{number(records.length)} {records.length === 1 ? 'MOTORISTA' : 'MOTORISTAS'}</span>
            </div>
            <div className="table-tools"><label className="search-box"><Search size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar motorista" aria-label="Buscar motorista" /></label><button className="add-mini" onClick={startNew}><Plus size={16} /><span>ADICIONAR</span></button></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>#</th><th>MOTORISTA</th><th>PERNA<br />INTEIRA</th><th>MEIA<br />PERNA</th><th>TOTAL</th><th>ENTRADA<br />NA BASE</th><th>SAÍDA<br />DA BASE</th><th>ENCERRAMENTO<br />DA OPERAÇÃO</th><th>MÉDIA DE<br />CONTAINER/HORA</th><th>TEMPO DE<br />OPERAÇÃO</th><th className="actions-col"><span className="sr-only">Ações</span></th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={11} className="table-empty"><LoaderCircle className="spin" size={21} /> Carregando lançamentos…</td></tr> : tableRecords.length ? tableRecords.map((record) => {
                    const rank = sortedRecords.findIndex((item) => item.id === record.id) + 1;
                    return <tr key={record.id}>
                      <td><span className={`rank-number ${rank <= 3 ? 'rank-highlight' : ''}`}>{rank}</span></td>
                      <td className="driver-cell">{record.driver_name}</td>
                      <td>{number(record.whole_legs)}</td><td>{number(record.half_legs)}</td><td className="total-cell">{number(legs(record))}</td>
                      <td>{record.base_arrival || '—'}</td><td>{record.base_departure}</td><td>{record.activity_end}</td><td className="avg-cell">{number(hourlyAverage(record), 1)}</td><td>{operationDuration(record.base_departure, record.activity_end)}</td>
                      <td className="row-actions"><button aria-label={`Editar ${record.driver_name}`} title="Editar" onClick={() => startEdit(record)}><Pencil size={14} /></button><button aria-label={`Excluir ${record.driver_name}`} title="Excluir" onClick={() => void removeRecord(record)}><Trash2 size={14} /></button></td>
                    </tr>;
                  }) : <tr><td colSpan={11} className="table-empty">{searchTerm ? 'Nenhum motorista encontrado.' : 'Nenhum lançamento nesta data. Clique em “Novo registro” para começar.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-footnote"><span><i className="status-dot" /> DADOS DO DIA</span><span>MÉDIA = TOTAL DE PERNAS ÷ HORAS ENTRE SAÍDA DA BASE E ENCERRAMENTO DA OPERAÇÃO</span></div>
          </section>
        </section>

        <footer className="brand-footer"><div className="footer-values"><span><Truck size={23} /> AGILIDADE</span><i /><span><strong className="shield-mark">✓</strong> SEGURANÇA</span><i /><span><strong className="gear-mark">✳</strong> EFICIÊNCIA</span><i /><span><strong className="people-mark">●●</strong> PARCERIAS</span><i /><span><strong className="chart-mark">↗</strong> RESULTADOS</span></div><div className="footer-signature"><span>JUNTOS, <b>MOVEMOS MAIS.</b></span><div className="footer-brand">ALENCAR <em>LOG</em></div></div></footer>
      </div>

      {formOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
        <section className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
          <div className="modal-heading"><div><span className="modal-kicker">LANÇAMENTO DIÁRIO · {dateLabel(selectedDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span><h2 id="form-title">{editingId === null ? 'Novo registro' : 'Editar produtividade'}</h2></div><button className="icon-button" onClick={() => setFormOpen(false)} aria-label="Fechar formulário"><X size={20} /></button></div>
          <form onSubmit={submitForm}>
            <label className="form-field full-field"><span>NOME DO MOTORISTA</span><input autoFocus maxLength={120} value={form.driverName} onChange={(event) => setForm({ ...form, driverName: event.target.value })} placeholder="Ex.: João da Silva" required /></label>
            <div className="form-grid"><label className="form-field"><span>PERNA INTEIRA</span><input type="number" min="0" step="1" value={form.wholeLegs} onChange={(event) => setForm({ ...form, wholeLegs: event.target.value })} required /></label><label className="form-field"><span>MEIA PERNA</span><input type="number" min="0" step="1" value={form.halfLegs} onChange={(event) => setForm({ ...form, halfLegs: event.target.value })} required /></label></div>
            <div className="calculated-total"><span>TOTAL DE PERNAS <small>PERNA INTEIRA + MEIA PERNA</small></span><strong>{number((Number(form.wholeLegs) || 0) + (Number(form.halfLegs) || 0))}</strong></div>
            <div className="time-grid"><label className="form-field"><span>ENTRADA NA BASE</span><input type="time" value={form.baseArrival} onChange={(event) => setForm({ ...form, baseArrival: event.target.value })} required={editingId === null || Boolean(form.baseArrival)} /></label><label className="form-field"><span>SAÍDA DA BASE</span><input type="time" value={form.baseDeparture} onChange={(event) => setForm({ ...form, baseDeparture: event.target.value })} required /></label><label className="form-field"><span>ENCERRAMENTO DA OPERAÇÃO</span><input type="time" value={form.activityEnd} onChange={(event) => setForm({ ...form, activityEnd: event.target.value })} required /></label></div>
            <div className="average-preview"><Clock3 size={16} /><span>TEMPO TRABALHADO · {operationDuration(form.baseDeparture, form.activityEnd)}<small>MÉDIA = TOTAL DE PERNAS ÷ HORAS ENTRE SAÍDA E ENCERRAMENTO</small></span><strong>{number(((() => { const hrs = operationHours(form.baseDeparture, form.activityEnd); return hrs ? ((Number(form.wholeLegs) || 0) + (Number(form.halfLegs) || 0)) / hrs : 0; })()), 1)}</strong></div>
            <p className="form-hint">A média usa as horas entre SAÍDA DA BASE e ENCERRAMENTO DA OPERAÇÃO. Lançamentos anteriores podem manter a entrada em branco até o horário ser informado.</p>
            <div className="modal-actions"><button type="button" className="btn btn-modal-quiet" onClick={() => setFormOpen(false)}>CANCELAR</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}{saving ? 'SALVANDO…' : 'SALVAR REGISTRO'}</button></div>
          </form>
        </section>
      </div>}

      {toast && <div className="toast-message" role="status">{toast}</div>}
    </main>
  );
}

function MetricCard({ icon: Icon, title, total, share, tone, description }: { icon: LucideIcon; title: string; total: number; share: string; tone: string; description: string }) {
  return <article className={`metric-card metric-${tone}`}><div className="metric-icon"><Icon size={25} strokeWidth={2.2} /></div><div className="metric-copy"><h2>{title}</h2><span>{description}</span></div><div className="metric-number"><strong>{number(total)}</strong><small>{share}</small></div></article>;
}

function Panel({ title, icon: Icon, className = '', children }: { title: string; icon: LucideIcon; className?: string; children: React.ReactNode }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div className="panel-title"><span className="panel-icon"><Icon size={19} /></span><h2>{title}</h2></div></div>{children}</section>;
}

function ChartLoading() {
  return <div className="chart-empty"><LoaderCircle className="spin" size={22} /><span>Carregando produtividade…</span></div>;
}

function EmptyChart({ text }: { text: string }) {
  return <div className="chart-empty"><BarChart3 size={25} /><span>{text}</span></div>;
}

function BarChart({ records }: { records: DriverRecord[] }) {
  const width = 760;
  const height = 206;
  const margin = { left: 35, right: 10, top: 12, bottom: 37 };
  const plotHeight = height - margin.top - margin.bottom;
  const plotWidth = width - margin.left - margin.right;
  const observedMaximum = Math.max(1, ...records.map(legs));
  const axisStep = Math.max(1, Math.ceil(observedMaximum / 5));
  const maxValue = axisStep * 5;
  const step = plotWidth / records.length;
  const barWidth = Math.min(39, step * 0.64);
  const gridCount = 5;
  return <div className="bar-chart-wrap"><svg className="bar-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de barras empilhadas com total de pernas por motorista">
    {Array.from({ length: gridCount + 1 }, (_, index) => {
      const value = axisStep * (gridCount - index);
      const y = margin.top + plotHeight * index / gridCount;
      return <g key={index}><line x1={margin.left} y1={y} x2={width - margin.right} y2={y} className="chart-gridline" /><text x={margin.left - 9} y={y + 4} textAnchor="end" className="axis-label">{value}</text></g>;
    })}
    {records.map((record, index) => {
      const x = margin.left + index * step + (step - barWidth) / 2;
      const wholeHeight = (Number(record.whole_legs) / maxValue) * plotHeight;
      const halfHeight = (Number(record.half_legs) / maxValue) * plotHeight;
      const bottom = margin.top + plotHeight;
      const label = record.driver_name.trim().split(/\s+/)[0].slice(0, 10);
      return <g key={record.id}><rect x={x} y={bottom - wholeHeight} width={barWidth} height={wholeHeight} fill="#8ee91d" rx="2" /><rect x={x} y={bottom - wholeHeight - halfHeight} width={barWidth} height={halfHeight} fill="#10b9ed" rx="2" /><text x={x + barWidth / 2} y={Math.max(10, bottom - (legs(record) / maxValue) * plotHeight - 6)} textAnchor="middle" className="bar-value">{legs(record)}</text><text x={x + barWidth / 2} y={height - 13} textAnchor="middle" className="bar-name">{label}</text></g>;
    })}
  </svg></div>;
}

function DonutChart({ whole, half, total }: { whole: number; half: number; total: number }) {
  const radius = 69;
  const circumference = 2 * Math.PI * radius;
  const wholeLength = total ? (whole / total) * circumference : 0;
  const halfLength = total ? (half / total) * circumference : 0;
  return <div className="donut-content">
    <div className="donut-legend left-legend"><span><i className="legend-dot lime" /> PERNA INTEIRA</span><strong>{number(whole)}</strong><b>{percentage(whole, total)}</b></div>
    <div className="donut-visual"><svg viewBox="0 0 180 180" role="img" aria-label={`Distribuição: perna inteira ${percentage(whole, total)} e meia perna ${percentage(half, total)}`}><circle cx="90" cy="90" r={radius} fill="none" stroke="#122c58" strokeWidth="25" />{total > 0 && <><circle cx="90" cy="90" r={radius} fill="none" stroke="#8ee91d" strokeWidth="25" strokeDasharray={`${wholeLength} ${circumference - wholeLength}`} transform="rotate(-90 90 90)" /><circle cx="90" cy="90" r={radius} fill="none" stroke="#0686ee" strokeWidth="25" strokeDasharray={`${halfLength} ${circumference - halfLength}`} strokeDashoffset={-wholeLength} transform="rotate(-90 90 90)" /></>}<text x="90" y="82" textAnchor="middle" className="donut-center-small">TOTAL</text><text x="90" y="111" textAnchor="middle" className="donut-center-number">{number(total)}</text><text x="90" y="129" textAnchor="middle" className="donut-center-small">MOVIMENTOS</text></svg></div>
    <div className="donut-legend right-legend"><span><i className="legend-dot cyan" /> MEIA PERNA</span><strong>{number(half)}</strong><b>{percentage(half, total)}</b></div>
  </div>;
}

function Ranking({ records }: { records: DriverRecord[] }) {
  const maximum = Math.max(1, ...records.map(legs));
  return <ol className="ranking-list">{records.map((record, index) => <li key={record.id} className="ranking-row"><span className={`ranking-medal medal-${index < 3 ? index + 1 : 'other'}`}>{index + 1}</span><div className="ranking-info"><div><strong title={record.driver_name}>{record.driver_name}</strong><span>{number(legs(record))}</span></div><div className="ranking-track"><i style={{ width: `${(legs(record) / maximum) * 100}%` }} /></div></div></li>)}</ol>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
