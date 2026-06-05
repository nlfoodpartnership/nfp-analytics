exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  const { password } = body;

  if (!password) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Password required' }) };
  }

  if (password === process.env.DASHBOARD_PASSWORD) {
    const token = Buffer.from(password).toString('base64');
    return { statusCode: 200, body: JSON.stringify({ ok: true, token }) };
  }

  return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Invalid password' }) };
};
