const checkAuth = require('./utils/auth-check');

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const platforms = {
    youtube: !!(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID),
    facebook: !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    instagram: !!(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.LINKEDIN_ORGANIZATION_ID),
    flodesk: !!process.env.FLODESK_API_KEY,
  };

  const configured = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
  return { statusCode: 200, body: JSON.stringify({ ...platforms, configured }) };
};
