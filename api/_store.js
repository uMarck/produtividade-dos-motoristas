import { put, list, get, del } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function validMonth(value) { return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value); }
const time = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export function validate(body) {
  if (!validDate(body.reportDate)) return 'Data inválida.';
  if (typeof body.driverName !== 'string' || !body.driverName.trim() || body.driverName.trim().length > 120) return 'Informe o motorista (até 120 caracteres).';
  if (![body.wholeLegs, body.halfLegs].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 2147483647)) return 'Quantidades inválidas.';
  if (body.baseArrival && !time(body.baseArrival)) return 'Entrada na base inválida.';
  if (!time(body.baseDeparture) || !time(body.activityEnd)) return 'Horários da operação inválidos.';
  return null;
}
const pathFor = (date, id) => `produtividade/${date}/${id}.json`;
export async function all(prefix) {
  let cursor;
  const blobs = [];
  do {
    const page = await list({ prefix: `produtividade/${prefix}`, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const rows = await Promise.all(blobs.map(async blob => {
    const result = await get(blob.pathname, { access: 'private' });
    return result?.statusCode === 200 ? JSON.parse(await new Response(result.stream).text()) : null;
  }));
  return rows.filter(Boolean).sort((a, b) => b.whole_legs + b.half_legs - a.whole_legs - a.half_legs || a.driver_name.localeCompare(b.driver_name, 'pt-BR'));
}
export async function save(body, existing) {
  const now = new Date().toISOString();
  const record = {
    id: existing?.id || randomUUID(), report_date: body.reportDate, driver_name: body.driverName.trim(),
    base_arrival: body.baseArrival || '', whole_legs: body.wholeLegs, half_legs: body.halfLegs,
    base_departure: body.baseDeparture, activity_end: body.activityEnd,
    operation_time: (() => { const duration = (minutes(body.activityEnd) - minutes(body.baseDeparture) + 1440) % 1440; return `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`; })(),
    created_at: existing?.created_at || now, updated_at: now,
  };
  await put(pathFor(record.report_date, record.id), JSON.stringify(record), { access: 'private', addRandomSuffix: false, allowOverwrite: Boolean(existing), contentType: 'application/json' });
  if (existing && existing.report_date !== record.report_date) await del(pathFor(existing.report_date, existing.id));
  return record;
}
export async function find(id) {
  // IDs are only accepted with a date in the URL; no global scan is needed.
  return id;
}
export async function remove(date, id) { await del(pathFor(date, id)); }
export function fail(res, error) { console.error('Produtividade:', error); return res.status(500).json({ error: 'Não foi possível concluir a operação. Tente novamente.' }); }
