module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ ok: false, error: 'Password required' });
  }

  if (password === process.env.DASHBOARD_PASSWORD) {
    const token = Buffer.from(password).toString('base64');
    return res.status(200).json({ ok: true, token });
  }

  return res.status(401).json({ ok: false, error: 'Invalid password' });
};
