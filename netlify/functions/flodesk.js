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
      const r = await fetch(`${baseUrl}/subscribers`, { headers });
      const data = await r.json();
      return json({ configured: true, total: data.total, data: data.data || [] });
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
