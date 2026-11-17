import { list, get } from '@vercel/blob';
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
const table = 'alencar_productivity_records';
export async function all(prefix, req, res) {
  const month = prefix.length === 7;
  const query = req.productivityDb.from(table).select('report_date,id,data,deleted_at');
  const { data: stored, error } = month
    ? await query.gte('report_date', `${prefix}-01`).lt('report_date', `${new Date(Date.UTC(Number(prefix.slice(0, 4)), Number(prefix.slice(5)), 1)).toISOString().slice(0, 7)}-01`)
    : await query.eq('report_date', prefix.slice(0, 10));
  if (error) throw error;
  const records = new Map();
  const covered = new Set((stored || []).map(row => `${row.report_date}/${row.id}`));
  let cursor;
  const blobs = [];
  try {
    do {
      const page = await list({ prefix: `produtividade/${prefix}`, cursor, limit: 1000 });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    const recovered = [];
    // Skip records already copied to Postgres. A blocked store must not trigger hundreds of failed reads.
    for (const blob of blobs) {
      const key = blob.pathname.replace(/^produtividade\//, '').replace(/\.json$/, '');
      if (covered.has(key)) continue;
      const result = await get(blob.pathname, { access: 'private' });
      if (result?.statusCode === 200) {
        const row = JSON.parse(await new Response(result.stream).text());
        records.set(`${row.report_date}/${row.id}`, row);
        recovered.push({ report_date: row.report_date, id: row.id, data: row });
      }
    }
    if (recovered.length) {
      const { error: migrationError } = await req.productivityDb.from(table).upsert(recovered, { onConflict: 'report_date,id', ignoreDuplicates: true });
      if (migrationError) console.warn('Migração do histórico pendente:', migrationError);
    }
  } catch (blobError) {
    // The legacy store is suspended on Vercel. New Supabase records remain usable.
    console.warn('Histórico do Blob indisponível:', blobError);
    res.setHeader('X-History-Incomplete', 'true');
  }
  for (const row of stored || []) {
    const key = `${row.report_date}/${row.id}`;
    if (row.deleted_at) records.delete(key);
    else records.set(key, row.data);
  }
  return [...records.values()].sort((a, b) => b.whole_legs + b.half_legs - a.whole_legs - a.half_legs || a.driver_name.localeCompare(b.driver_name, 'pt-BR'));
}
export async function save(body, existing, req) {
  const now = new Date().toISOString();
  const record = {
    id: existing?.id || randomUUID(), report_date: body.reportDate, driver_name: body.driverName.trim(),
    base_arrival: body.baseArrival || '', whole_legs: body.wholeLegs, half_legs: body.halfLegs,
    base_departure: body.baseDeparture, activity_end: body.activityEnd,
    operation_time: (() => { const duration = (minutes(body.activityEnd) - minutes(body.baseDeparture) + 1440) % 1440; return `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`; })(),
    created_at: existing?.created_at || now, updated_at: now,
  };
  const db = req.productivityDb;
  const { error } = await db.from(table).upsert({ report_date: record.report_date, id: record.id, data: record, deleted_at: null }, { onConflict: 'report_date,id' });
  if (error) throw error;
  if (existing && existing.report_date !== record.report_date) await remove(existing.report_date, existing.id, req);
  return record;
}
export async function find(id) {
  // IDs are only accepted with a date in the URL; no global scan is needed.
  return id;
}
export async function remove(date, id, req) {
  const { error } = await req.productivityDb.from(table).upsert({ report_date: date, id, data: {}, deleted_at: new Date().toISOString() }, { onConflict: 'report_date,id' });
  if (error) throw error;
}
export function fail(res, error) { console.error('Produtividade:', error); return res.status(500).json({ error: 'Não foi possível concluir a operação. Tente novamente.' }); }
