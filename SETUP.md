# NFP Analytics — Deployment Guide

This guide walks you through deploying the dashboard to Vercel so anyone on
your team can access it at a shared URL — no local server required.

---

## 1. Create a free Vercel account

Sign up at [vercel.com](https://vercel.com) (free Hobby plan is sufficient).

---

## 2. Install the Vercel CLI

```bash
npm i -g vercel
```

---

## 3. Deploy

Open Terminal, navigate to this folder, and run:

```bash
cd ~/Documents/nfp-analytics   # adjust path as needed
vercel
```

Follow the prompts:
- Link to your Vercel account
- Create a new project (or link an existing one)
- Accept the defaults for framework and build settings

Vercel will give you a preview URL (e.g. `https://nfp-analytics-abc123.vercel.app`).

---

## 4. Add environment variables

In the [Vercel Dashboard](https://vercel.com/dashboard):

1. Open your project
2. Go to **Settings → Environment Variables**
3. Add each of the following (mark as **Production** + **Preview**):

| Variable | Description |
|----------|-------------|
| `DASHBOARD_PASSWORD` | Shared login password for the dashboard |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `YOUTUBE_CHANNEL_ID` | Your YouTube channel ID (starts with `UC`) |
| `FACEBOOK_PAGE_ID` | Your Facebook Page numeric ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Long-lived Facebook Page Access Token |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Instagram Business Account ID |
| `LINKEDIN_CLIENT_ID` | LinkedIn app Client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn app Client Secret |
| `LINKEDIN_ORGANIZATION_ID` | LinkedIn company page Organization ID |
| `FLODESK_API_KEY` | Flodesk API key |

You don't need all of them — platforms without credentials fall back to demo data automatically.

---

## 5. Re-deploy to production

After adding your environment variables, deploy to production:

```bash
vercel --prod
```

---

## 6. Share the URL

Share **`https://your-project.vercel.app`** with your team. They'll see a
password prompt — enter the `DASHBOARD_PASSWORD` value you set in step 4.

---

## Per-platform credential instructions

### YouTube
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select an existing one)
3. **APIs & Services → Library** — search for and enable **YouTube Data API v3**
4. **APIs & Services → Credentials → Create Credentials → API Key**
5. Copy the key into `YOUTUBE_API_KEY`
6. Find your Channel ID: YouTube Studio → Settings → Channel → Advanced settings
7. Copy the Channel ID (starts with `UC`) into `YOUTUBE_CHANNEL_ID`

### Facebook
1. Go to [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → Business
2. Add the **Pages** product to your app
3. Use **Graph API Explorer** to generate a **Page Access Token** with these permissions:
   `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`,
   `read_insights`
4. Your **Page ID** is on your Facebook Page → About → scroll to the bottom
5. Paste into `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_ACCESS_TOKEN`

> **Note on token expiry:** User tokens expire in ~1 hour. Page Access Tokens
> can be made long-lived (60 days) by exchanging them:
> ```
> GET https://graph.facebook.com/v19.0/oauth/access_token
>   ?grant_type=fb_exchange_token
>   &client_id=YOUR_APP_ID
>   &client_secret=YOUR_APP_SECRET
>   &fb_exchange_token=YOUR_SHORT_LIVED_TOKEN
> ```
> Do this in Graph API Explorer or with curl. After 60 days, repeat the exchange.

### Instagram (Business Account)
Your Instagram account must be a **Business or Creator** account linked to a
Facebook Page (the same Page used above).

1. In Graph API Explorer, run:
   ```
   GET /{your-facebook-page-id}?fields=instagram_business_account
   ```
2. Copy the `id` value from the result into `INSTAGRAM_BUSINESS_ACCOUNT_ID`
3. The same `FACEBOOK_PAGE_ACCESS_TOKEN` is used — ensure it has
   `instagram_basic` and `instagram_manage_insights` permissions

### LinkedIn (OAuth — requires browser login)
1. Go to [linkedin.com/developers](https://www.linkedin.com/developers) → Create App
2. Associate it with your LinkedIn Company Page
3. Under **Products**, request access to:
   - **Share on LinkedIn**
   - **Marketing Developer Platform**
4. Under **Auth**, add this OAuth 2.0 Redirect URL:
   ```
   https://your-project.vercel.app/api/linkedin?type=callback
   ```
5. Copy **Client ID** → `LINKEDIN_CLIENT_ID`
6. Copy **Client Secret** → `LINKEDIN_CLIENT_SECRET`
7. Your **Organization ID** is the number at the end of your Company Page URL:
   `linkedin.com/company/12345678` → use `12345678`
8. Copy into `LINKEDIN_ORGANIZATION_ID`

LinkedIn requires a one-time browser login (OAuth). After deploying, navigate
to the **Social Media** section of the dashboard — if LinkedIn is configured
but not yet authenticated, a **Connect LinkedIn** badge will appear. Click it
to authorize via LinkedIn.

> **Note:** The LinkedIn access token is stored in server memory. Vercel
> serverless functions can be cold-started, which may clear the token. If the
> Connect button reappears, click it again to re-authenticate.

### Flodesk
1. In Flodesk, go to **Account Settings** (bottom-left avatar) → **Integrations**
2. Under **API**, copy your API Key
3. Paste into `FLODESK_API_KEY`

---

## Facebook token refresh (every 60 days)

Facebook long-lived Page Access Tokens expire after 60 days. To refresh:

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your App and generate a new User Token with the required permissions
3. Exchange for a long-lived token using the URL in the Facebook section above
4. Update `FACEBOOK_PAGE_ACCESS_TOKEN` in Vercel: **Settings → Environment Variables**
5. Re-deploy: `vercel --prod`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Dashboard shows login screen | Enter the `DASHBOARD_PASSWORD` you set in Vercel env vars |
| YouTube returns 403 | Check API key restrictions in Google Cloud Console; make sure YouTube Data API v3 is enabled |
| Facebook returns `OAuthException` | Token expired — generate a new long-lived token |
| Instagram returns empty data | Confirm the account is a Business account linked to the Facebook Page |
| LinkedIn shows "Connect" button after connecting | Serverless function was cold-started — click Connect again |
| Dashboard shows demo data | Check that env vars are set in Vercel and you've re-deployed after adding them |
