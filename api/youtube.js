const checkAuth = require('./_auth-check');

module.exports = async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type } = req.query;
  const { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } = process.env;

  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
    return res.status(200).json({ configured: false });
  }

  try {
    if (type === 'channel') {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      const item = data.items && data.items[0];
      if (!item) return res.status(200).json({ configured: true, error: 'No channel found' });
      const { statistics, snippet } = item;
      return res.status(200).json({
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

      if (!ids) return res.status(200).json({ configured: true, videos: [] });

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

      return res.status(200).json({ configured: true, videos });
    }

    return res.status(400).json({ error: 'Invalid type. Use channel or videos.' });
  } catch (err) {
    return res.status(500).json({ configured: true, error: err.message });
  }
};
