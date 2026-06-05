module.exports = function checkAuth(req) {
  const auth = req.headers['x-dashboard-token'];
  if (!auth) return false;
  try {
    const decoded = Buffer.from(auth, 'base64').toString('utf8');
    return decoded === process.env.DASHBOARD_PASSWORD;
  } catch { return false; }
};
