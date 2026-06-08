const checkAuth = require('./utils/auth-check');

// The "NFP Content Performance — Key Insights" Notion page
const PAGE_ID = '379d7ed937da819e9493cb3a52eeae07';

function richTextToHtml(richTextArray) {
  return (richTextArray || []).map(t => {
    let text = t.plain_text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    if (t.annotations?.bold) text = `<strong>${text}</strong>`;
    if (t.annotations?.italic) text = `<em>${text}</em>`;
    if (t.href) text = `<a href="${t.href}" target="_blank" rel="noopener">${text}</a>`;
    return text;
  }).join('');
}

function richTextToPlain(richTextArray) {
  return (richTextArray || []).map(t => t.plain_text).join('');
}

async function fetchBlocks(blockId, headers) {
  let all = [], cursor, hasMore = true;
  while (hasMore) {
    const qs = cursor ? `&start_cursor=${cursor}` : '';
    const r = await fetch(
      `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100${qs}`,
      { headers }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || 'Notion API error');
    all.push(...(data.results || []));
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }
  return all;
}

function convertBlocksToItems(blocks) {
  const items = [];
  let pendingList = null;

  for (const block of blocks) {
    if (block.type === 'bulleted_list_item') {
      if (!pendingList) {
        pendingList = { type: 'ul', items: [] };
        items.push(pendingList);
      }
      pendingList.items.push(richTextToHtml(block.bulleted_list_item.rich_text));
      continue;
    }
    if (block.type === 'numbered_list_item') {
      if (!pendingList || pendingList.type !== 'ol') {
        pendingList = { type: 'ol', items: [] };
        items.push(pendingList);
      }
      pendingList.items.push(richTextToHtml(block.numbered_list_item.rich_text));
      continue;
    }
    pendingList = null;

    if (block.type === 'heading_2') {
      const text = richTextToHtml(block.heading_2.rich_text);
      if (text) items.push({ type: 'h2', html: text });
    } else if (block.type === 'heading_3') {
      const text = richTextToHtml(block.heading_3.rich_text);
      if (text) items.push({ type: 'h3', html: text });
    } else if (block.type === 'paragraph') {
      const html = richTextToHtml(block.paragraph.rich_text);
      if (html.trim()) items.push({ type: 'p', html });
    } else if (block.type === 'divider') {
      items.push({ type: 'divider' });
    } else if (block.type === 'callout') {
      const html = richTextToHtml(block.callout.rich_text);
      if (html.trim()) items.push({ type: 'callout', html });
    } else if (block.type === 'quote') {
      const html = richTextToHtml(block.quote.rich_text);
      if (html.trim()) items.push({ type: 'quote', html });
    }
  }
  return items;
}

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
  };

  try {
    // Fetch top-level page metadata to get last-edited time
    const pageRes = await fetch(`https://api.notion.com/v1/pages/${PAGE_ID}`, { headers });
    const pageData = await pageRes.json();
    const lastEdited = pageData.last_edited_time || null;

    // Fetch all blocks
    const blocks = await fetchBlocks(PAGE_ID, headers);

    // Split into sections by heading_1
    const sections = [];
    let current = null;

    for (const block of blocks) {
      if (block.type === 'heading_1') {
        if (current) sections.push(current);
        current = {
          title: richTextToPlain(block.heading_1.rich_text),
          blocks: [],
        };
      } else if (current) {
        current.blocks.push(block);
      }
    }
    if (current) sections.push(current);

    // Convert each section's blocks to renderable items
    // Reverse so newest section (last on page) appears first in feed
    const output = sections.map(s => ({
      title: s.title,
      items: convertBlocksToItems(s.blocks),
    })).reverse();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configured: true,
        sections: output,
        lastEdited,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ configured: true, error: err.message }),
    };
  }
};
