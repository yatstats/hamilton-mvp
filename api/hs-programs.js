// api/hs-programs.js
// HS directory API backed by Neon (Postgres) using the `tbc_schools_raw` table.

import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL, // set in Vercel → Settings → Environment Variables
});

/**
 * Return HS baseball programs in the shape your front-end expects.
 *
 * We’re using:
 *   - tbc_schools_raw as the base (17k+ rows)
 *   - Placeholder 0’s for the “success stats” until hs_programs_stats is wired in
 */
export default async function handler(req, res) {
  try {
    // Allow CORS from anywhere for now
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { q, state } = req.query || {};

    const values = [];
    const where = [];

    // Text search across school name + city
    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      where.push(
        `(LOWER(s.hsname) LIKE $${values.length} OR LOWER(s.cityname) LIKE $${values.length})`
      );
    }

    // State filter (2-letter abbreviation)
    if (state) {
      values.push(state.toUpperCase());
      where.push(`s.state_abbrev = $${values.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        s.hsid,                         -- numeric/string ID
        s.hsname,                       -- school name
        s.cityname      AS city,        -- city
        s.state_name    AS regionname,  -- use state name as "region"
        s.state_abbrev  AS state_abbr,

        -- temporary placeholder stats until hs_programs_stats is wired
        0 AS "YAT?STATS NATIONAL RANK",
        0 AS "YAT?STATS STATE RANK",
        0 AS "Current Active Alumni",
        0 AS "MLB Players Produced",
        0 AS "All-Time Next Level Alumni",
        0 AS "Drafted out of High School",
        0 AS "Drafted",

        NULL AS "Microsite Sub-Domain"
      FROM tbc_schools_raw s
      ${whereClause}
      ORDER BY s.hsname ASC
      LIMIT 20000;
    `;

    const result = await pool.query(sql, values);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error querying Neon in hs-programs:", err);
    res
      .status(500)
      .json({ error: "Failed to load HS programs from database." });
  }
}