const crypto = require('crypto');

function makeToken(password) {
  const secret = process.env.TOKEN_SECRET || process.env.DASHBOARD_PASSWORD;
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

module.exports = function checkAuth(event) {
  const token = event.headers['x-dashboard-token'];
  if (!token) return false;
  try {
    const expected = makeToken(process.env.DASHBOARD_PASSWORD);
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
};
