// /api/news-articles.js
// Serverless handler – reads from news_articles table in Neon Postgres.
// HSID is required so articles are always scoped to the requesting microsite.

const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NEON_DATABASE_URL);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Only allow GET
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { hsid, page = '1', pageSize = '30' } = req.query;

    if (!hsid) {
      return res.status(400).json({ error: 'hsid query parameter is required' });
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(pageSize, 10) || 30, 1), 100);
    const offset = (pageNum - 1) * perPage;

    // Fetch articles for this school, excluding rows with missing title or url
    const rows = await sql(
      `
      SELECT
        id,
        hsid,
        teamid,
        playerid,
        player_name,
        title,
        source,
        published_at,
        url,
        image_url,
        snippet,
        category,
        country,
        domain_rank,
        ingested_at
      FROM news_articles
      WHERE hsid = $1
        AND title IS NOT NULL
        AND url   IS NOT NULL
      ORDER BY published_at DESC
      LIMIT $2 OFFSET $3
      `,
      [hsid, perPage, offset]
    );

    // Total count for pagination metadata
    const countRows = await sql(
      `
      SELECT COUNT(*)::int AS count
      FROM news_articles
      WHERE hsid = $1
        AND title IS NOT NULL
        AND url   IS NOT NULL
      `,
      [hsid]
    );

    const total = countRows[0]?.count || 0;

    res.status(200).json({
      page: pageNum,
      pageSize: perPage,
      total,
      hasMore: offset + rows.length < total,
      articles: rows,
    });
  } catch (err) {
    console.error('Error in /api/news-articles:', err);
    res.status(500).json({
      error: 'Server error while loading news articles.',
      message: err.message,
    });
  }
};
