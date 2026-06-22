const checkAuth = require('./utils/auth-check');
const DATABASE_ID = 'adb9c7e97d744c29aac6c1e8466da117';

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
        const totalScans = p['Total Scans']?.number ?? null;
        if (totalScans === null) continue;
        all.push({
          name:       p['QR Code Name']?.rich_text?.[0]?.plain_text || p.Name?.title?.[0]?.plain_text || '',
          totalScans,
          type:       p.Type?.select?.name || '',
          linksTo:    p['Links To']?.url || '',
          topCountries: p['Top Countries']?.rich_text?.[0]?.plain_text || '',
          notes:      p.Notes?.rich_text?.[0]?.plain_text || '',
          year:       p.Year?.select?.name || '',
          quarter:    p.Quarter?.select?.name || '',
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
    console.error('qr function error:', err);
    return { statusCode: 500, body: JSON.stringify({ configured: true, error: 'Internal error' }) };
  }
};
