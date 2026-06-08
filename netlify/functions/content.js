const checkAuth = require('./utils/auth-check');
const DATABASE_ID = '14dbccf1773948b3b5f792f8b093bef6';

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { NOTION_TOKEN } = process.env;
  if (!NOTION_TOKEN) {
    return { statusCode: 200, body: JSON.stringify({ configured: false }) };
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
      if (!r.ok) return { statusCode: 500, body: JSON.stringify({ configured: true, error: data.message }) };

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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configured: true, records: all }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ configured: true, error: err.message }) };
  }
};
