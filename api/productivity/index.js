import { all, save, validate, validDate, validMonth, fail } from '../_store.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (req.query.month) {
        if (!validMonth(req.query.month)) return res.status(400).json({ error: 'Mês inválido.' });
        return res.json(await all(req.query.month));
      }
      if (!validDate(req.query.date)) return res.status(400).json({ error: 'Data inválida.' });
      return res.json(await all(`${req.query.date}/`));
    }
    if (req.method === 'POST') {
      const error = validate(req.body || {});
      if (error) return res.status(400).json({ error });
      const existing = await all(`${req.body.reportDate}/`);
      if (existing.some(row => row.driver_name.toLocaleLowerCase('pt-BR') === req.body.driverName.trim().toLocaleLowerCase('pt-BR'))) return res.status(409).json({ error: 'Motorista já lançado nesta data. Use editar.' });
      return res.status(201).json(await save(req.body));
    }
    return res.status(405).end();
  } catch (error) { return fail(res, error); }
}
