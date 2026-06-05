const checkAuth = require('./_auth-check');

module.exports = async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type } = req.query;
  const { FLODESK_API_KEY } = process.env;

  if (!FLODESK_API_KEY) {
    return res.status(200).json({ configured: false });
  }

  const baseUrl = 'https://api.flodesk.com/v1';
  const authHeader = `Basic ${Buffer.from(FLODESK_API_KEY + ':').toString('base64')}`;
  const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };

  try {
    if (type === 'subscribers') {
      const r = await fetch(`${baseUrl}/subscribers`, { headers });
      const data = await r.json();
      return res.status(200).json({ configured: true, total: data.total, data: data.data || [] });
    }

    if (type === 'emails') {
      const r = await fetch(`${baseUrl}/emails`, { headers });
      const data = await r.json();
      return res.status(200).json({ configured: true, emails: data.data || [] });
    }

    return res.status(400).json({ error: 'Invalid type. Use subscribers or emails.' });
  } catch (err) {
    return res.status(500).json({ configured: true, error: err.message });
  }
};
