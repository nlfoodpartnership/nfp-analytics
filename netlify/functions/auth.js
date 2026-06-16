const crypto = require('crypto');

function makeToken(password) {
  const secret = process.env.TOKEN_SECRET || process.env.DASHBOARD_PASSWORD;
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

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
    const token = makeToken(password);
    return { statusCode: 200, body: JSON.stringify({ ok: true, token }) };
  }

  // Deliberate delay on failure to slow brute-force attempts
  await new Promise(r => setTimeout(r, 1500));
  return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Invalid password' }) };
};
