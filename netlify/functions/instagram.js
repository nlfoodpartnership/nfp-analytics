const checkAuth = require('./utils/auth-check');

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const type = event.queryStringParameters?.type;
  const { INSTAGRAM_BUSINESS_ACCOUNT_ID, FACEBOOK_PAGE_ACCESS_TOKEN } = process.env;

  if (!INSTAGRAM_BUSINESS_ACCOUNT_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    return { statusCode: 200, body: JSON.stringify({ configured: false }) };
  }

  const json = (data) => ({ statusCode: 200, body: JSON.stringify(data) });

  try {
    if (type === 'account') {
      const url = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}?fields=name,biography,followers_count,media_count,profile_picture_url&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) return json({ configured: true, error: data.error.message });
      return json({ configured: true, ...data });
    }

    if (type === 'posts') {
      const url = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,insights.metric(impressions,reach)&limit=10&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) return json({ configured: true, error: data.error.message });
      return json({ configured: true, posts: data.data || [] });
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid type. Use account or posts.' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ configured: true, error: err.message }) };
  }
};
