const checkAuth = require('./utils/auth-check');
const DATABASE_ID = '55253ccea09d4545a3c92df852a3f588';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: { Allow: 'GET' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
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
      if (!r.ok) {
        console.error('Notion API error:', data.message);
        return { statusCode: 500, body: JSON.stringify({ configured: true, error: 'Failed to fetch data' }) };
      }

      for (const page of (data.results || [])) {
        const p = page.properties;
        const downloads = p['Unique Downloads']?.number ?? null;
        if (downloads === null) continue;
        all.push({
          name:         p.Name?.title?.[0]?.plain_text || '',
          documentType: p['Document Type']?.select?.name || '',
          theme:        p.Theme?.select?.name || '',
          external:     p.External?.select?.name || '',
          downloads,
          quarter:      p.Quarter?.select?.name || '',
          year:         p.Year?.select?.name || '',
          notes:        p.Notes?.rich_text?.[0]?.plain_text || '',
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
    console.error('downloads function error:', err);
    return { statusCode: 500, body: JSON.stringify({ configured: true, error: 'Internal error' }) };
  }
};
