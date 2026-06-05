const checkAuth = require('./_auth-check');

module.exports = async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type } = req.query;
  const { FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN } = process.env;

  if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    return res.status(200).json({ configured: false });
  }

  try {
    if (type === 'page') {
      const url = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}?fields=name,fan_count,followers_count,talking_about_count&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) return res.status(200).json({ configured: true, error: data.error.message });
      return res.status(200).json({
        configured: true,
        name: data.name,
        followers: data.followers_count,
        fans: data.fan_count,
        talkingAbout: data.talking_about_count,
      });
    }

    if (type === 'posts') {
      const url = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}/posts?fields=message,created_time,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) return res.status(200).json({ configured: true, error: data.error.message });
      return res.status(200).json({ configured: true, posts: data.data || [] });
    }

    return res.status(400).json({ error: 'Invalid type. Use page or posts.' });
  } catch (err) {
    return res.status(500).json({ configured: true, error: err.message });
  }
};
