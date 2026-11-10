import { createClient } from '@supabase/supabase-js';

const allowed = new Set(['admin@alencarlog.com.br', 'admin1@alencarlog.com.br']);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

export async function requireAdmin(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
  if (!match) {
    res.status(401).json({ error: 'Entre com sua conta para acessar a produtividade.' });
    return false;
  }
  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) {
    res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' });
    return false;
  }
  if (!allowed.has(data.user.email?.toLowerCase())) {
    res.status(403).json({ error: 'Esta conta não tem acesso à produtividade.' });
    return false;
  }
  return true;
}
