const checkAuth = require('./_auth-check');

module.exports = async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const configured = [];
  const result = {};

  const platforms = {
    youtube: !!(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID),
    facebook: !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    instagram: !!(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
    linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.LINKEDIN_ORGANIZATION_ID),
    flodesk: !!process.env.FLODESK_API_KEY,
  };

  for (const [platform, isConfigured] of Object.entries(platforms)) {
    result[platform] = isConfigured;
    if (isConfigured) configured.push(platform);
  }

  result.configured = configured;
  return res.status(200).json(result);
};
