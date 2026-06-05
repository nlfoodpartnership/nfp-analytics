const checkAuth = require('./utils/auth-check');

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const type = event.queryStringParameters?.type;
  const { FLODESK_API_KEY } = process.env;

  if (!FLODESK_API_KEY) {
    return { statusCode: 200, body: JSON.stringify({ configured: false }) };
  }

  const baseUrl = 'https://api.flodesk.com/v1';
  const authHeader = `Basic ${Buffer.from(FLODESK_API_KEY + ':').toString('base64')}`;
  const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };
  const json = (data) => ({ statusCode: 200, body: JSON.stringify(data) });

  try {
    if (type === 'subscribers') {
      // Fetch up to 3 pages in parallel to get a fast count without paginating everything
      const pages = await Promise.all([1, 2, 3].map(p =>
        fetch(`${baseUrl}/subscribers?page=${p}&per_page=100`, { headers }).then(r => r.json())
      ));
      const all = pages.flatMap(d => d.data || []);
      const hasMore = (pages[2].data || []).length === 100;
      const total = hasMore ? `${all.length}+` : all.length;
      const active = all.filter(s => s.status === 'active').length;
      const activeTotal = hasMore ? `${active}+` : active;
      return json({ configured: true, total, active: activeTotal, data: all });
    }

    if (type === 'emails') {
      const r = await fetch(`${baseUrl}/emails`, { headers });
      const data = await r.json();
      return json({ configured: true, emails: data.data || [] });
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid type. Use subscribers or emails.' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ configured: true, error: err.message }) };
  }
};
