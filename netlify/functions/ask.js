const checkAuth = require('./utils/auth-check');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  if (!checkAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { SLACK_WEBHOOK_URL } = process.env;
  if (!SLACK_WEBHOOK_URL) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Slack not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const name     = (body.name     || '').trim().slice(0, 100);
  const question = (body.question || '').trim().slice(0, 2000);

  if (!name || !question) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Name and question are required' }) };
  }

  const payload = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*New question from NFP Analytics dashboard*`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*From:*\n${name}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Question:*\n${question}`,
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Sent via NFP Analytics · ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC` },
        ],
      },
    ],
  };

  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Slack webhook error:', res.status, text);
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Failed to send to Slack' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('ask function error:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Internal error' }) };
  }
};
