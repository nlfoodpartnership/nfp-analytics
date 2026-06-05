const checkAuth = require('./utils/auth-check');

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const type = event.queryStringParameters?.type;
  const { FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN } = process.env;

  if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    return { statusCode: 200, body: JSON.stringify({ configured: false }) };
  }

  const json = (data) => ({ statusCode: 200, body: JSON.stringify(data) });

  try {
    if (type === 'page') {
      const url = `https://graph.facebook.com/v19.0/${FACEBOOK_PAGE_ID}?fields=name,fan_count,followers_count,talking_about_count&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.error) return json({ configured: true, error: data.error.message });
      return json({
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
      if (data.error) return json({ configured: true, error: data.error.message });
      return json({ configured: true, posts: data.data || [] });
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid type. Use page or posts.' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ configured: true, error: err.message }) };
  }
};
