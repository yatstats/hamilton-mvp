// microsite-template/api/hs-programs.js
// Uses real data from tbc_schools_raw and hs_programs_stats in Neon.
// No hard-coded fake stats; missing stats stay NULL.

import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL, // set in Vercel env vars
});

export default async function handler(req, res) {
  try {
    const { q, state } = req.query || {};

    const values = [];
    const where = [];

    // Text search on hsname or cityname
    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      where.push(
        `(LOWER(s.hsname) LIKE $${values.length} OR LOWER(s.cityname) LIKE $${values.length})`
      );
    }

    // Optional state filter (expects e.g. "AZ", "CA")
    if (state) {
      values.push(state.toUpperCase());
      where.push(`s.state_abbrev = $${values.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        -- real columns from tbc_schools_raw
        s.hsid,
        s.hsname,
        s.cityname,
        s.state_abbrev,
        s.state_name,

        -- shape them into what the front-end expects
        CONCAT(s.cityname, ', ', s.state_abbrev) AS city,
        s.state_name AS regionname,

        -- real stats from hs_programs_stats (when present)
        p.overall_rank              AS "YAT?STATS NATIONAL RANK",
        NULL::int                   AS "YAT?STATS STATE RANK", -- we don't have this yet
        p.active_players_2024_25    AS "Current Active Alumni",
        p.major_leaguers            AS "MLB Players Produced",
        p.alumni_listed             AS "All-Time Next Level Alumni",
        p.drafted_from_school       AS "Drafted out of High School",
        p.total_draft_picks         AS "Drafted",

        -- microsite URL / CTA column (hooked up later)
        NULL::text                  AS "Microsite Sub-Domain"
      FROM tbc_schools_raw s
      LEFT JOIN hs_programs_stats p
        ON p.hsid = s.hsid
      ${whereClause}
      ORDER BY s.hsname ASC
      LIMIT 500;
    `;

    const { rows } = await pool.query(sql, values);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(rows);
  } catch (err) {
    console.error("hs-programs API error:", err);
    res.status(500).json({ error: "Failed to load HS programs." });
  }
}
