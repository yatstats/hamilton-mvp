// api/hs-programs.js
// Uses Neon serverless client (no "pg" dependency needed)

import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});

/**
 * Return HS baseball programs in the exact shape
 * the front-end expects.
 *
 * Data source: public.tbc_schools_raw
 */
export default async function handler(req, res) {
  try {
    const { q, state } = req.query || {};

    const values = [];
    const where = [];

    // Text search on hsname or cityname
    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      where.push(
        `(LOWER(hsname) LIKE $${values.length} OR LOWER(cityname) LIKE $${values.length})`
      );
    }

    // Optional state filter (2-letter abbreviation)
    if (state) {
      values.push(state.toUpperCase());
      where.push(`state_abbrev = $${values.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        -- real columns from tbc_schools_raw
        hsid,
        hsname,
        cityname            AS city,
        state_name          AS regionname,
        state_abbrev        AS state_abbr,

        -- placeholder stats until hs_programs_stats is populated
        0::int              AS "YAT?STATS NATIONAL RANK",
        0::int              AS "YAT?STATS STATE RANK",
        0::int              AS "Current Active Alumni",
        0::int              AS "MLB Players Produced",
        0::int              AS "All-Time Next Level Alumni",
        0::int              AS "Drafted out of High School",
        0::int              AS "Drafted",

        -- button text / URL column used by the search UI
        ('https://' || hsid || '.yatstats.com')
                            AS "Microsite Sub-Domain"
      FROM tbc_schools_raw
      ${whereClause}
      ORDER BY hsname ASC
      LIMIT 20000;
    `;

    const result = await pool.query(sql, values);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error in /api/hs-programs:", err);
    res.status(500).json({ error: "Failed to load HS programs." });
  }
}