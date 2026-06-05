const checkAuth = require('./utils/auth-check');

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const type = event.queryStringParameters?.type;
  const { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } = process.env;

  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
    return { statusCode: 200, body: JSON.stringify({ configured: false }) };
  }

  const json = (data) => ({ statusCode: 200, body: JSON.stringify(data) });

  try {
    if (type === 'channel') {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      const item = data.items && data.items[0];
      if (!item) return json({ configured: true, error: 'No channel found' });
      const { statistics, snippet } = item;
      return json({
        configured: true,
        subscribers: parseInt(statistics.subscriberCount || 0, 10),
        totalViews: parseInt(statistics.viewCount || 0, 10),
        videoCount: parseInt(statistics.videoCount || 0, 10),
        title: snippet.title,
        thumbnail: snippet.thumbnails?.default?.url,
      });
    }

    if (type === 'videos') {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&order=date&maxResults=20&type=video&key=${YOUTUBE_API_KEY}`;
      const searchR = await fetch(searchUrl);
      const searchData = await searchR.json();
      const items = searchData.items || [];
      const ids = items.map(i => i.id.videoId).join(',');

      if (!ids) return json({ configured: true, videos: [] });

      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ids}&key=${YOUTUBE_API_KEY}`;
      const statsR = await fetch(statsUrl);
      const statsData = await statsR.json();
      const statsMap = {};
      (statsData.items || []).forEach(v => { statsMap[v.id] = v; });

      const videos = items.map(item => {
        const vid = statsMap[item.id.videoId] || {};
        const stats = vid.statistics || {};
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          publishedAt: item.snippet.publishedAt,
          views: parseInt(stats.viewCount || 0, 10),
          likes: parseInt(stats.likeCount || 0, 10),
          comments: parseInt(stats.commentCount || 0, 10),
          duration: vid.contentDetails?.duration || '',
        };
      });

      return json({ configured: true, videos });
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid type. Use channel or videos.' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ configured: true, error: err.message }) };
  }
};
