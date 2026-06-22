const checkAuth = require('./_auth-check');
const DATABASE_ID = '14dbccf1773948b3b5f792f8b093bef6';

module.exports = async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { NOTION_TOKEN } = process.env;
  if (!NOTION_TOKEN) {
    return res.status(200).json({ configured: false });
  }

  const headers = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  try {
    let all = [], cursor, hasMore = true;
    while (hasMore) {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const r = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(500).json({ configured: true, error: data.message });

      for (const page of (data.results || [])) {
        const p = page.properties;
        all.push({
          name: p.Name?.title?.[0]?.plain_text || '',
          contentType: p['Content Type']?.select?.name || '',
          platform: p.Platform?.select?.name || '',
          year: p.Year?.select?.name || '',
          quarter: p.Quarter?.select?.name || '',
          pageViews: p['Page Views']?.number ?? null,
          uniqueVisitors: p['Unique Visitors']?.number ?? null,
          avgTimeOnPage: p['Avg Time on Page']?.number ?? null,
          likes: p['Likes / Reactions']?.number ?? null,
          comments: p.Comments?.number ?? null,
          shares: p.Shares?.number ?? null,
          ctr: p['CTR (%)']?.number ?? null,
          url: p.URL?.url || null,
          notes: p.Notes?.rich_text?.[0]?.plain_text || '',
        });
      }

      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    return res.status(200).json({ configured: true, records: all });
  } catch (err) {
    return res.status(500).json({ configured: true, error: err.message });
  }
};
