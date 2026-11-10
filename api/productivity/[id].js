import { all, save, remove, validate, validDate, fail } from '../_store.js';
import { requireAdmin } from '../_auth.js';

export default async function handler(req, res) {
  try {
    if (!await requireAdmin(req, res)) return;
    const date = req.query.date || req.body?.reportDate;
    if (!validDate(date) || typeof req.query.id !== 'string' || !/^[a-f0-9-]{36}$/.test(req.query.id)) return res.status(400).json({ error: 'Registro inválido.' });
    const rows = await all(`${date}/`);
    const record = rows.find(row => row.id === req.query.id);
    if (!record) return res.status(404).json({ error: 'Registro não encontrado.' });
    if (req.method === 'DELETE') { await remove(date, record.id); return res.status(204).end(); }
    if (req.method === 'PUT') {
      const error = validate(req.body || {});
      if (error) return res.status(400).json({ error });
      if (rows.some(row => row.id !== record.id && row.driver_name.toLocaleLowerCase('pt-BR') === req.body.driverName.trim().toLocaleLowerCase('pt-BR'))) return res.status(409).json({ error: 'Motorista já lançado nesta data.' });
      return res.json(await save(req.body, record));
    }
    return res.status(405).end();
  } catch (error) { return fail(res, error); }
}
