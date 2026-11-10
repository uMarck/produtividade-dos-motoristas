export default function handler(_req, res) {
  res.json({ ok: Boolean(process.env.BLOB_READ_WRITE_TOKEN) });
}
