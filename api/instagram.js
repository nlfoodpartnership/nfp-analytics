const checkAuth = require('./_auth-check');

module.exports = async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type } = req.query;
  const { INSTAGRAM_BUSINESS_ACCOUNT_ID, FACEBOOK_PAGE_ACCESS_TOKEN } = process.env;

  if (!INSTAGRAM_BUSINESS_ACCOUNT_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    return res.status(200).json({ configured: false });
  }

  try {
    if (type === 'account') {
      const url = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}?fields=name,biography,followers_count,media_count,profile_picture_url&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) return res.status(200).json({ configured: true, error: data.error.message });
      return res.status(200).json({ configured: true, ...data });
    }

    if (type === 'posts') {
      const url = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,insights.metric(impressions,reach)&limit=10&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) return res.status(200).json({ configured: true, error: data.error.message });
      return res.status(200).json({ configured: true, posts: data.data || [] });
    }

    return res.status(400).json({ error: 'Invalid type. Use account or posts.' });
  } catch (err) {
    return res.status(500).json({ configured: true, error: err.message });
  }
};
