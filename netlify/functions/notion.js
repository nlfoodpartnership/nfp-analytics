const checkAuth = require('./utils/auth-check');
const DATABASE_ID = '5e0f8c876ee346b7829e3678ad9a6c12';

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
        const result = p.Result?.number ?? null;
        if (result === null) continue;
        all.push({
          platform: p.Platform?.select?.name || '',
          metric: p.Metric?.select?.name || '',
          year: p.Year?.select?.name || '',
          quarter: p.Quarter?.select?.name || '',
          result,
          target: p.Target?.number ?? null,
          publication: p.Publication?.rich_text?.[0]?.plain_text || '',
          notes: p.Notes?.rich_text?.[0]?.plain_text || '',
          warning: (p.Notes?.rich_text?.[0]?.plain_text || '').startsWith('⚠'),
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
