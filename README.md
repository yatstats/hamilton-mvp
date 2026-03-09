# hamilton-mvp
The MVP for the first ever YATSTATS Microsite. One day this MVP will be live at hamilton.yatstats.com, with 1000+ more microsites just like it.

## Version restore-v4.6.0
This branch represents the restore-v4.6.0 state of the Hamilton microsite.

---

## Deployment — `/api/news-articles`

The alumni-news page (`alumni-news.html`) fetches live articles from a Vercel Serverless Function:

```
GET /api/news-articles?hsid=<HSID>&page=1&pageSize=30
```

The handler lives at `api/news-articles.js` and is deployed automatically by Vercel as a Node.js serverless function whenever the repository is pushed.

### Required environment variable

| Variable | Description |
|---|---|
| `NEON_DATABASE_URL` | Full connection string for the Neon Postgres database that contains the `news_articles` table. Set this in the Vercel project's **Settings → Environment Variables** panel. |

The connection string format is:
```
postgresql://user:password@host/dbname?sslmode=require
```

### What happens without the variable or function

If `NEON_DATABASE_URL` is not set, the function will throw and return HTTP 500. The client will fall back to the embedded demo JSON in the HTML page and display an **orange warning banner** ("⚠ Demo data") so that sample content is never mistaken for live data.

### `news_articles` table schema (expected columns)

| Column | Type | Notes |
|---|---|---|
| `id` | int/uuid | Primary key |
| `hsid` | int | Foreign key — microsite school ID |
| `teamid` | int | Optional — future team filtering |
| `playerid` | int | Optional — future player profile links |
| `player_name` | text | |
| `title` | text | Required (rows with null title are excluded) |
| `source` | text | |
| `published_at` | timestamptz | Sort key |
| `url` | text | Required (rows with null url are excluded) |
| `image_url` | text | |
| `snippet` | text | |
| `category` | text | Used to classify pro vs college (e.g. `MLB`, `NCAA-D1`) |
| `country` | text | |
| `domain_rank` | int | |
| `ingested_at` | timestamptz | |
