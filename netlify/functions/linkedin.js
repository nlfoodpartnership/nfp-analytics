const checkAuth = require('./utils/auth-check');

// Module-level token storage (persists across warm invocations; cleared on cold start)
let linkedinToken = null;

exports.handler = async (event) => {
  const type = event.queryStringParameters?.type;

  const redirect = (url) => ({ statusCode: 302, headers: { Location: url }, body: '' });
  const json = (data, status = 200) => ({ statusCode: status, body: JSON.stringify(data) });

  // Public routes — no auth required
  if (type === 'auth') {
    const { LINKEDIN_CLIENT_ID } = process.env;
    if (!LINKEDIN_CLIENT_ID) return json({ configured: false });
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers['host'];
    const redirectUri = `${proto}://${host}/.netlify/functions/linkedin?type=callback`;
    const state = Buffer.from(String(Date.now())).toString('base64');
    const scope = 'r_organization_social r_organization_followers';
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
    return redirect(authUrl);
  }

  if (type === 'callback') {
    const { code } = event.queryStringParameters;
    const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET } = process.env;
    if (!code || !LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      return redirect('/?linkedin_error=missing_params');
    }
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers['host'];
    const redirectUri = `${proto}://${host}/.netlify/functions/linkedin?type=callback`;

    try {
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        linkedinToken = tokenData.access_token;
        return redirect('/?linkedin_connected=1');
      }
      return redirect('/?linkedin_error=token_exchange_failed');
    } catch (err) {
      return redirect(`/?linkedin_error=${encodeURIComponent(err.message)}`);
    }
  }

  // All other routes require auth
  if (!checkAuth(event)) return json({ error: 'Unauthorized' }, 401);

  const { LINKEDIN_ORGANIZATION_ID } = process.env;

  if (type === 'status') {
    return json({ authenticated: !!linkedinToken });
  }

  if (type === 'page') {
    if (!LINKEDIN_ORGANIZATION_ID) return json({ configured: false });
    if (!linkedinToken) return json({ configured: true, authenticated: false });

    try {
      const headers = { Authorization: `Bearer ${linkedinToken}` };
      const [followersRes, sharesRes] = await Promise.all([
        fetch(`https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${LINKEDIN_ORGANIZATION_ID}`, { headers }),
        fetch(`https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:organization:${LINKEDIN_ORGANIZATION_ID}&count=10`, { headers }),
      ]);

      const followersData = await followersRes.json();
      const sharesData = await sharesRes.json();

      const element = (followersData.elements || [])[0] || {};
      const totalFollowers = element.totalFollowerCount || 0;
      const followerGrowth = (element.followerGains || []).reduce((sum, g) => sum + (g.organicFollowerGain || 0), 0);

      return json({
        configured: true,
        authenticated: true,
        followers: totalFollowers,
        followerGrowth,
        recentPosts: sharesData.elements || [],
      });
    } catch (err) {
      return json({ configured: true, authenticated: true, error: err.message }, 500);
    }
  }

  return json({ error: 'Invalid type. Use auth, callback, status, or page.' }, 400);
};
