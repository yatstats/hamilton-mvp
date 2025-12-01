// microsite-template/api/hs-programs.js
// HS search API – uses tbc_schools_raw + hs_programs_stats

import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});

export default async function handler(req, res) {
  try {
    const { q, state } = req.query || {};
    const values = [];
    const whereParts = [];

    // Text search across hsname, cityname, state_name
    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      const idx = values.length;
      whereParts.push(
        `(LOWER(s.hsname) LIKE $${idx} OR LOWER(s.cityname) LIKE $${idx} OR LOWER(s.state_name) LIKE $${idx})`
      );
    }

    // State filter (two-letter abbrev coming from the dropdown)
    if (state) {
      values.push(state.toUpperCase());
      const idx = values.length;
      whereParts.push(`s.state_abbrev = $${idx}`);
    }

    const whereClause = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    const sql = `
      SELECT
        s.hsid,
        s.hsname,
        s.hslocation       AS city,        -- e.g. "CHANDLER, AZ"
        s.state_name       AS regionname,  -- full state name

        -- Stats (can be NULL for now; we COALESCE to 0 where it makes sense)
        COALESCE(st.overall_rank, NULL)         AS "YAT?STATS NATIONAL RANK",
        NULL::integer                           AS "YAT?STATS STATE RANK",  -- placeholder for future

        COALESCE(st.active_players_2024_25, 0)  AS "Current Active Alumni",
        COALESCE(st.major_leaguers, 0)         AS "MLB Players Produced",
        COALESCE(st.alumni_listed, 0)          AS "All-Time Next Level Alumni",
        COALESCE(st.drafted_from_school, 0)    AS "Drafted out of High School",
        COALESCE(st.total_draft_picks, 0)      AS "Drafted",

        -- For now, just use hsid-based microsite subdomain
        (s.hsid::text || '.yatstats.com')      AS "Microsite Sub-Domain"
      FROM tbc_schools_raw s
      LEFT JOIN hs_programs_stats st
        ON st.hsid = s.hsid
      ${whereClause}
      ORDER BY s.hsname ASC
      LIMIT 20000;
    `;

    const result = await pool.query(sql, values);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error querying Neon (hs-programs):", err);
    res.status(500).json({ error: "Failed to load HS programs." });
  }
}