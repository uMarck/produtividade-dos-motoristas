import XLSX from 'xlsx-js-style';

export async function addCheckerSheets(workbook, db, date, month) {
  const entries = [];
  const end = month && new Date(month + '-01T00:00:00Z');
  const nextMonth = end && new Date(end.setUTCMonth(end.getUTCMonth() + 1)).toISOString().slice(0, 10);
  for (let offset = 0; ; offset += 500) {
    const query = db.from('alencar_checker_productivity').select('date,name,count').eq('deleted', false)
      .order('date').order('id').range(offset, offset + 499);
    const { data, error } = month
      ? await query.gte('date', month + '-01').lt('date', nextMonth)
      : await query.eq('date', date);
    if (error) throw error;
    entries.push(...data);
    if (data.length < 500) break;
  }

  const totals = new Map();
  for (const { name, count } of entries) {
    const key = name.toLocaleLowerCase('pt-BR');
    const previous = totals.get(key);
    totals.set(key, { name: previous?.name ?? name, count: (previous?.count ?? 0) + count });
  }
  const ranked = [...totals.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
  const fill = rgb => ({ patternType: 'solid', fgColor: { rgb } });
  const bar = (color) => ({ t: 's', v: ' ', s: { fill: fill(color) } });
  const ranking = XLSX.utils.aoa_to_sheet([
    ['POSIÇÃO', 'CONFERENTE', 'PUXADAS', 'GRÁFICO DE PUXADAS (TOP 12)'],
    ...ranked.map(({ name, count }, index) => [
      index + 1, name, count,
      ...(index < 12 ? Array.from({ length: 20 }, (_, i) =>
        bar(i < Math.round(count / Math.max(1, ranked[0].count) * 20) ? 'A96DE8' : '302047')) : []),
    ]),
  ]);
  ranking['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 13 }, ...Array.from({ length: 20 }, () => ({ wch: 2 }))];
  ranking['!merges'] = [XLSX.utils.decode_range('D1:W1')];
  const details = XLSX.utils.aoa_to_sheet([
    ['DATA', 'CONFERENTE', 'CONTÊINERES CONFERIDOS'],
    ...entries.map(({ date, name, count }) => [date, name, count]),
  ]);
  details['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 27 }];

  for (const sheet of [ranking, details]) {
    for (const col of ['A', 'B', 'C', 'D']) {
      if (sheet[col + '1']) sheet[col + '1'].s = { fill: fill('4E2C72'), font: { bold: true, color: { rgb: 'FFD385' } } };
    }
  }
  XLSX.utils.book_append_sheet(workbook, ranking, 'Ranking conferentes');
  XLSX.utils.book_append_sheet(workbook, details, 'Lançamentos conferentes');
}
