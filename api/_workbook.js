import XLSX from 'xlsx-js-style';
function validTime(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
}

function minutesOfDay(value) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function durationMinutes(start, end) {
  return (minutesOfDay(end) - minutesOfDay(start) + 1440) % 1440;
}

function durationLabel(minutes) {
  const safeMinutes = Math.max(0, Math.trunc(minutes));
  return `${String(Math.floor(safeMinutes / 60)).padStart(2, '0')}:${String(safeMinutes % 60).padStart(2, '0')}`;
}

function addMinutesToTime(start, duration) {
  const total = (minutesOfDay(start) + duration) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function validateRecord(body, { allowBlankArrival = false } = {}) {
  const driverName = typeof body.driverName === 'string' ? body.driverName.trim() : '';
  if (!validDate(body.reportDate)) return 'Informe uma data de referência válida.';
  if (!driverName || driverName.length > 120) return 'Informe o nome do motorista (até 120 caracteres).';
  if (!Number.isSafeInteger(body.wholeLegs) || body.wholeLegs < 0) return 'Perna inteira deve ser um número inteiro igual ou maior que zero.';
  if (!Number.isSafeInteger(body.halfLegs) || body.halfLegs < 0) return 'Meia perna deve ser um número inteiro igual ou maior que zero.';
  if (!validTime(body.baseArrival) && !(allowBlankArrival && body.baseArrival === '')) return 'Informe a entrada na base no formato HH:MM.';
  if (!validTime(body.baseDeparture)) return 'Informe a saída da base no formato HH:MM.';
  if (!validTime(body.activityEnd)) return 'Informe o encerramento da operação no formato HH:MM.';
  return null;
}

function normalizeRecord(row) {
  const start = row.base_departure || '00:00';
  // Rows saved before this change stored elapsed time in operation_time. Derive their
  // end time on read, so every historical launch remains visible without destructive rewrites.
  const end = row.activity_end || addMinutesToTime(start, validTime(row.operation_time) ? minutesOfDay(row.operation_time) : 0);
  const elapsed = durationMinutes(start, end);
  return { ...row, base_arrival: row.base_arrival || '', base_departure: start, activity_end: end, operation_time: durationLabel(elapsed) };
}

const COLORS = { navy: '071B3E', cyan: '13C6F5', lime: '91ED1D', white: 'F5F8FF', pale: 'E7F3FA', line: 'A8D8E8' };
const styles = {
  title: { font: { name: 'Arial', sz: 16, bold: true, color: { rgb: COLORS.white } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } }, alignment: { vertical: 'center', horizontal: 'left' } },
  metaLabel: { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: COLORS.lime } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } }, alignment: { vertical: 'center' } },
  metaValue: { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: COLORS.navy } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.pale } }, alignment: { vertical: 'center' } },
  section: { font: { name: 'Arial', sz: 11, bold: true, color: { rgb: COLORS.lime } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } }, alignment: { vertical: 'center', horizontal: 'left' }, border: { bottom: { style: 'medium', color: { rgb: COLORS.cyan } } } },
  header: { font: { name: 'Arial', sz: 9, bold: true, color: { rgb: COLORS.white } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } }, alignment: { vertical: 'center', horizontal: 'center', wrapText: true }, border: { bottom: { style: 'medium', color: { rgb: COLORS.cyan } } } },
  body: { font: { name: 'Arial', sz: 9, color: { rgb: COLORS.navy } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.pale } }, alignment: { vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: COLORS.line } } } },
  accent: { font: { name: 'Arial', sz: 9, bold: true, color: { rgb: COLORS.navy } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.lime } }, alignment: { vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: COLORS.cyan } } } },
  kpiLabel: { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: COLORS.lime } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: COLORS.cyan } }, left: { style: 'thin', color: { rgb: COLORS.cyan } }, right: { style: 'thin', color: { rgb: COLORS.cyan } } } },
  kpiValue: { font: { name: 'Arial', sz: 22, bold: true, color: { rgb: COLORS.white } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { left: { style: 'thin', color: { rgb: COLORS.cyan } }, right: { style: 'thin', color: { rgb: COLORS.cyan } } } },
  kpiShare: { font: { name: 'Arial', sz: 11, bold: true, color: { rgb: COLORS.lime } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: COLORS.cyan } }, left: { style: 'thin', color: { rgb: COLORS.cyan } }, right: { style: 'thin', color: { rgb: COLORS.cyan } } } },
  limeBar: { font: { name: 'Arial', sz: 11, bold: true, color: { rgb: COLORS.lime } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } }, alignment: { vertical: 'center' } },
  cyanBar: { font: { name: 'Arial', sz: 11, bold: true, color: { rgb: COLORS.cyan } }, fill: { patternType: 'solid', fgColor: { rgb: COLORS.navy } }, alignment: { vertical: 'center' } },
};

function applyRowStyle(sheet, rowNumber, firstColumn, lastColumn, style) {
  for (let column = firstColumn; column <= lastColumn; column += 1) {
    const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: column });
    const cell = sheet[address] || (sheet[address] = { t: 's', v: '' });
    cell.s = style;
  }
}

function cellFormula(formula, value, format) {
  const cell = { f: formula, v: value, t: typeof value === 'number' ? 'n' : 's' };
  if (format) cell.z = format;
  return cell;
}

function excelTime(value) {
  const [hour, minute] = value.split(':').map(Number);
  return (hour * 60 + minute) / 1440;
}

function excelTimeCell(value) {
  return validTime(value) ? { t: 'n', v: excelTime(value), z: 'hh:mm' } : { t: 's', v: '' };
}

export function createProductivityWorkbook(reportDate, rawRows) {
  const rows = rawRows.map(normalizeRecord);
  const [year, month, day] = reportDate.split('-').map(Number);
  const localDay = new Date(Date.UTC(year, month - 1, day, 12));
  const longDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(localDay);
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(localDay).toLocaleUpperCase('pt-BR');
  const detailFirstRow = 5;
  const detailLastRow = Math.max(detailFirstRow, detailFirstRow + rows.length - 1);
  const detailHeaders = ['POSIÇÃO', 'DATA DE REFERÊNCIA', 'MOTORISTA', 'PERNA INTEIRA', 'MEIA PERNA', 'TOTAL DE PERNAS', 'ENTRADA NA BASE', 'SAÍDA DA BASE', 'ENCERRAMENTO DA OPERAÇÃO', 'MÉDIA DE CONTAINER/HORA', 'TEMPO DE OPERAÇÃO (CALCULADO)', 'CRIADO EM', 'ATUALIZADO EM'];
  const detailData = [
    ['PRODUTIVIDADE COMPLETA DE MOTORISTAS — GRUPO ALENCAR LOG'],
    ['DATA DE REFERÊNCIA', longDate, 'MÊS DE REFERÊNCIA', monthLabel],
    [],
    detailHeaders,
    ...rows.map((row, index) => {
      const excelRow = detailFirstRow + index;
      const movementTotal = Number(row.whole_legs) + Number(row.half_legs);
      const elapsedMinutes = durationMinutes(row.base_departure, row.activity_end);
      const hourly = elapsedMinutes ? movementTotal / (elapsedMinutes / 60) : 0;
      return [
        cellFormula(`IFERROR(RANK(F${excelRow},$F$${detailFirstRow}:$F$${detailLastRow},0)+COUNTIF($F$${detailFirstRow}:F${excelRow},F${excelRow})-1,0)`, index + 1),
        reportDate,
        row.driver_name,
        Number(row.whole_legs),
        Number(row.half_legs),
        cellFormula(`D${excelRow}+E${excelRow}`, movementTotal),
        excelTimeCell(row.base_arrival),
        excelTimeCell(row.base_departure),
        excelTimeCell(row.activity_end),
        cellFormula(`IFERROR(IF(MOD(I${excelRow}-H${excelRow},1)>0,F${excelRow}/(MOD(I${excelRow}-H${excelRow},1)*24),0),0)`, Number(hourly.toFixed(2)), '0.0'),
        cellFormula(`MOD(I${excelRow}-H${excelRow},1)`, elapsedMinutes / 1440, '[h]:mm'),
        row.created_at || '',
        row.updated_at || '',
      ];
    }),
  ];
  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  detailSheet['!cols'] = [{ wch: 12 }, { wch: 19 }, { wch: 34 }, { wch: 16 }, { wch: 14 }, { wch: 17 }, { wch: 18 }, { wch: 17 }, { wch: 24 }, { wch: 22 }, { wch: 27 }, { wch: 21 }, { wch: 21 }];
  detailSheet['!rows'] = [{ hpt: 32 }, { hpt: 23 }, { hpt: 7 }, { hpt: 34 }, ...rows.map(() => ({ hpt: 23 }))];
  detailSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: detailHeaders.length - 1 } }];
  detailSheet['!autofilter'] = { ref: `A4:M${Math.max(4, detailLastRow)}` };
  detailSheet['!freeze'] = { xSplit: 0, ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft', state: 'frozen' };
  applyRowStyle(detailSheet, 1, 0, detailHeaders.length - 1, styles.title);
  applyRowStyle(detailSheet, 2, 0, 3, styles.metaValue);
  detailSheet.A2.s = styles.metaLabel;
  detailSheet.C2.s = styles.metaLabel;
  applyRowStyle(detailSheet, 4, 0, detailHeaders.length - 1, styles.header);
  for (let row = detailFirstRow; row <= detailLastRow; row += 1) {
    applyRowStyle(detailSheet, row, 0, detailHeaders.length - 1, styles.body);
    if (detailSheet[`F${row}`]) detailSheet[`F${row}`].s = styles.accent;
    for (const col of ['G', 'H', 'I']) if (detailSheet[`${col}${row}`]) detailSheet[`${col}${row}`].s = { ...styles.body, alignment: { horizontal: 'center', vertical: 'center' } };
    if (detailSheet[`J${row}`]) detailSheet[`J${row}`].s = { ...styles.accent, alignment: { horizontal: 'center', vertical: 'center' } };
    if (detailSheet[`K${row}`]) detailSheet[`K${row}`].s = { ...styles.body, alignment: { horizontal: 'center', vertical: 'center' } };
  }

  const wholeTotal = rows.reduce((sum, row) => sum + Number(row.whole_legs), 0);
  const halfTotal = rows.reduce((sum, row) => sum + Number(row.half_legs), 0);
  const totalLegs = wholeTotal + halfTotal;
  const wholeShare = totalLegs ? wholeTotal / totalLegs : 0;
  const halfShare = totalLegs ? halfTotal / totalLegs : 0;
  const rankingCount = Math.min(10, rows.length);
  const summaryData = [
    ['PRODUTIVIDADE DE MOTORISTAS — GRUPO ALENCAR LOG'],
    ['DATA DE REFERÊNCIA', longDate, '', 'MÊS DE REFERÊNCIA', monthLabel],
    [],
    ['PERNA INTEIRA', '', '', 'MEIA PERNA', '', '', 'TOTAL GERAL'],
    [cellFormula(`SUM('Todos os dados'!D${detailFirstRow}:D${detailLastRow})`, wholeTotal), '', '', cellFormula(`SUM('Todos os dados'!E${detailFirstRow}:E${detailLastRow})`, halfTotal), '', '', cellFormula(`SUM('Todos os dados'!F${detailFirstRow}:F${detailLastRow})`, totalLegs)],
    [cellFormula('IFERROR(A5/G5,0)', wholeShare, '0.0%'), '', '', cellFormula('IFERROR(D5/G5,0)', halfShare, '0.0%'), '', '', cellFormula('IFERROR(G5/G5,0)', rows.length ? 1 : 0, '0.0%')],
    [],
    ['DISTRIBUIÇÃO DA DEMANDA'],
    ['TIPO DE MOVIMENTO', 'TOTAL', 'DEMANDA %', 'REPRESENTAÇÃO VISUAL'],
    ['Perna inteira', cellFormula(`SUM('Todos os dados'!D${detailFirstRow}:D${detailLastRow})`, wholeTotal), cellFormula('IFERROR(B10/$G$5,0)', wholeShare, '0.0%'), cellFormula(`REPT("■",ROUND(C10*36,0))`, '■'.repeat(Math.round(wholeShare * 36)))],
    ['Meia perna', cellFormula(`SUM('Todos os dados'!E${detailFirstRow}:E${detailLastRow})`, halfTotal), cellFormula('IFERROR(B11/$G$5,0)', halfShare, '0.0%'), cellFormula(`REPT("■",ROUND(C11*36,0))`, '■'.repeat(Math.round(halfShare * 36)))],
    ['Total geral', cellFormula(`SUM('Todos os dados'!F${detailFirstRow}:F${detailLastRow})`, totalLegs), cellFormula('IFERROR(B12/$G$5,0)', rows.length ? 1 : 0, '0.0%'), cellFormula(`REPT("■",ROUND(C12*36,0))`, '■'.repeat(rows.length ? 36 : 0))],
    [],
    ['TOP 10 MOTORISTAS'],
    ['POSIÇÃO', 'MOTORISTA', '', '', '', '', 'TOTAL DE PERNAS', 'PARTICIPAÇÃO', 'MÉDIA/HORA', 'PRODUTIVIDADE'],
  ];
  for (let index = 0; index < rankingCount; index += 1) {
    const rowNumber = 16 + index;
    const entry = rows[index];
    const count = entry ? Number(entry.whole_legs) + Number(entry.half_legs) : 0;
    const hours = entry ? durationMinutes(entry.base_departure, entry.activity_end) / 60 : 0;
    const share = totalLegs ? count / totalLegs : 0;
    const avg = hours ? count / hours : 0;
    summaryData.push([
      index + 1,
      entry ? cellFormula(`IFERROR(INDEX('Todos os dados'!$C$${detailFirstRow}:$C$${detailLastRow},MATCH(A${rowNumber},'Todos os dados'!$A$${detailFirstRow}:$A$${detailLastRow},0)),"")`, entry.driver_name) : '',
      '', '', '', '',
      entry ? cellFormula(`IFERROR(INDEX('Todos os dados'!$F$${detailFirstRow}:$F$${detailLastRow},MATCH(A${rowNumber},'Todos os dados'!$A$${detailFirstRow}:$A$${detailLastRow},0)),0)`, count) : 0,
      cellFormula(`IFERROR(G${rowNumber}/$G$5,0)`, share, '0.0%'),
      entry ? cellFormula(`IFERROR(INDEX('Todos os dados'!$J$${detailFirstRow}:$J$${detailLastRow},MATCH(A${rowNumber},'Todos os dados'!$A$${detailFirstRow}:$A$${detailLastRow},0)),0)`, Number(avg.toFixed(2)), '0.0') : 0,
      cellFormula(`REPT("■",ROUND(H${rowNumber}*36,0))`, '■'.repeat(Math.round(share * 36))),
    ]);
  }
  summaryData.push([]);
  summaryData.push(['Todos os lançamentos, horários de entrada e saída, duração, totais e médias estão na aba “Todos os dados”. Os totais, percentuais, ranking e médias desta aba usam fórmulas do Excel.']);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 3 }, { wch: 16 }, { wch: 16 }, { wch: 3 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 37 }];
  summarySheet['!rows'] = [{ hpt: 32 }, { hpt: 23 }, { hpt: 8 }, { hpt: 24 }, { hpt: 36 }, { hpt: 23 }, { hpt: 9 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 }, { hpt: 25 }, { hpt: 8 }, { hpt: 25 }, { hpt: 29 }, ...Array.from({ length: rankingCount }, () => ({ hpt: 23 })), { hpt: 8 }, { hpt: 32 }];
  summarySheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, { s: { r: 3, c: 3 }, e: { r: 3, c: 5 } }, { s: { r: 3, c: 6 }, e: { r: 3, c: 9 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }, { s: { r: 4, c: 3 }, e: { r: 4, c: 5 } }, { s: { r: 4, c: 6 }, e: { r: 4, c: 9 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } }, { s: { r: 5, c: 3 }, e: { r: 5, c: 5 } }, { s: { r: 5, c: 6 }, e: { r: 5, c: 9 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 9 } }, { s: { r: 8, c: 3 }, e: { r: 8, c: 9 } },
    { s: { r: 9, c: 3 }, e: { r: 9, c: 9 } }, { s: { r: 10, c: 3 }, e: { r: 10, c: 9 } }, { s: { r: 11, c: 3 }, e: { r: 11, c: 9 } },
    { s: { r: 13, c: 0 }, e: { r: 13, c: 9 } },
    ...Array.from({ length: rankingCount }, (_, index) => ({ s: { r: 15 + index, c: 1 }, e: { r: 15 + index, c: 5 } })),
    { s: { r: 16 + rankingCount, c: 0 }, e: { r: 16 + rankingCount, c: 9 } },
  ];
  applyRowStyle(summarySheet, 1, 0, 9, styles.title);
  applyRowStyle(summarySheet, 2, 0, 4, styles.metaValue);
  summarySheet.A2.s = styles.metaLabel;
  summarySheet.D2.s = styles.metaLabel;
  for (const col of [0, 3, 6]) applyRowStyle(summarySheet, 4, col, col === 6 ? 9 : col + 2, styles.kpiLabel);
  for (const col of [0, 3, 6]) applyRowStyle(summarySheet, 5, col, col === 6 ? 9 : col + 2, styles.kpiValue);
  for (const col of [0, 3, 6]) applyRowStyle(summarySheet, 6, col, col === 6 ? 9 : col + 2, styles.kpiShare);
  applyRowStyle(summarySheet, 8, 0, 9, styles.section);
  applyRowStyle(summarySheet, 9, 0, 9, styles.header);
  for (let row = 10; row <= 12; row += 1) {
    applyRowStyle(summarySheet, row, 0, 9, styles.body);
    summarySheet[`D${row}`].s = row === 10 ? styles.limeBar : styles.cyanBar;
  }
  applyRowStyle(summarySheet, 14, 0, 9, styles.section);
  applyRowStyle(summarySheet, 15, 0, 9, styles.header);
  for (let row = 16; row < 16 + rankingCount; row += 1) {
    applyRowStyle(summarySheet, row, 0, 9, styles.body);
    summarySheet[`G${row}`].s = styles.accent;
    summarySheet[`J${row}`].s = row <= 18 ? styles.limeBar : styles.cyanBar;
  }
  applyRowStyle(summarySheet, 17 + rankingCount, 0, 9, { ...styles.metaValue, alignment: { wrapText: true, vertical: 'center' } });
  summarySheet['!freeze'] = { xSplit: 0, ySplit: 2, topLeftCell: 'A3', activePane: 'bottomLeft', state: 'frozen' };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Painel diário');
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Todos os dados');
  if (!workbook.Workbook) workbook.Workbook = {};
  workbook.Workbook.CalcPr = { calcMode: 'auto', fullCalcOnLoad: true, forceFullCalc: true };
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}

