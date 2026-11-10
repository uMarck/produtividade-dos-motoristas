import { all, validDate, validMonth, fail } from '../_store.js';
import { createProductivityWorkbook } from '../_workbook.js';
import XLSX from 'xlsx-js-style';
import { requireAdmin } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!await requireAdmin(req, res)) return;
  const { date, month } = req.query;
  if (month ? !validMonth(month) : !validDate(date)) return res.status(400).json({ error: 'Período inválido.' });
  try {
    const rows = await all(month || `${date}/`);
    let workbook;
    if (month) {
      // Detail rows retain their actual report dates, even when the same driver appears on many days.
      const sheet = XLSX.utils.aoa_to_sheet([
        ['DATA', 'MOTORISTA', 'PERNA INTEIRA', 'MEIA PERNA', 'TOTAL', 'ENTRADA NA BASE', 'SAÍDA DA BASE', 'ENCERRAMENTO', 'TEMPO DE OPERAÇÃO', 'CONTAINERS/HORA'],
        ...rows.sort((a,b) => a.report_date.localeCompare(b.report_date) || a.driver_name.localeCompare(b.driver_name)).map(r => {
          const [h,m] = r.operation_time.split(':').map(Number);
          const total = Number(r.whole_legs) + Number(r.half_legs);
          return [r.report_date, r.driver_name, Number(r.whole_legs), Number(r.half_legs), total, r.base_arrival, r.base_departure, r.activity_end, r.operation_time, h * 60 + m ? Number((total / ((h * 60 + m) / 60)).toFixed(2)) : 0];
        }),
      ]);
      sheet['!cols'] = [{wch:14},{wch:32},...Array.from({length:8},()=>({wch:19}))];
      sheet['!autofilter'] = { ref: `A1:J${rows.length + 1}` };
      const byDriver = new Map();
      for (const row of rows) {
        const key = row.driver_name.toLocaleLowerCase('pt-BR');
        const item = byDriver.get(key) || {name:row.driver_name, whole:0, half:0, minutes:0, days:new Set()};
        item.whole += Number(row.whole_legs); item.half += Number(row.half_legs);
        const [h,m] = row.operation_time.split(':').map(Number); item.minutes += h * 60 + m;
        item.days.add(row.report_date); byDriver.set(key,item);
      }
      const summary = [...byDriver.values()].sort((a,b) => b.whole+b.half-a.whole-b.half);
      const overview = XLSX.utils.aoa_to_sheet([
        ['MOTORISTA','DIAS TRABALHADOS','PERNA INTEIRA','MEIA PERNA','TOTAL','TEMPO TOTAL (HORAS)','MÉDIA CONTAINERS/HORA'],
        ...summary.map(r=>[r.name,r.days.size,r.whole,r.half,r.whole+r.half,Number((r.minutes/60).toFixed(2)),r.minutes ? Number(((r.whole+r.half)/(r.minutes/60)).toFixed(2)) : 0]),
      ]);
      overview['!cols']=[{wch:32},...Array.from({length:6},()=>({wch:23}))];
      workbook=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook,overview,'Resumo mensal');
      XLSX.utils.book_append_sheet(workbook,sheet,'Lançamentos do mês');
      workbook=XLSX.write(workbook,{bookType:'xlsx',type:'buffer'});
    } else workbook=createProductivityWorkbook(date,rows);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename="alencar-produtividade-${(month || date).replaceAll('-','')}.xlsx"`);
    return res.send(workbook);
  } catch(error) { return fail(res,error); }
}
