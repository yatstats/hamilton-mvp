
// api/players/index.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Neon connection string (set in Vercel env)
});

export default async function handler(req, res) {
  try {
    // Optional: filter by hsid (e.g., 5004 for Hamilton)
    const { hsid } = req.query;

    const client = await pool.connect();

    try {
      const params = [];
      let whereClause = '';

      if (hsid) {
        params.push(Number(hsid));
        whereClause = 'WHERE hsid = $1';
      }

      const { rows } = await client.query(
        `
        SELECT
          slug,
          display_name,
          first,
          last,
          grad_class,
          letter_years,
          status,
          level,
          team,
          org,
          position,
          height,
          weight,
          bats,
          throws,
          draft_info,
          colleges,
          next_game_date,
          next_game_time,
          next_game_opponent,
          next_game_datetime,
          last_game_1,
          last_game_2,
          last_game_3,
          x_handle,
          ig_handle,
          video_url,
          nil_score,
          stats -- JSON column with stats like AVG, OBP, etc.
        FROM microsite_players
        ${whereClause}
        ORDER BY display_name;
        `,
        params
      );

      // Make sure stats is an object
      const players = rows.map((r) => ({
        ...r,
        stats: r.stats || {},
      }));

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).json({ players });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('players API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
