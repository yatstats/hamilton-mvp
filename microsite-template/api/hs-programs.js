// api/hs-programs.js
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL, // set this in Vercel env vars
});

/**
 * Simple API to return all HS baseball programs
 * in the shape your front-end already expects.
 */
export default async function handler(req, res) {
  try {
    // Optional: allow search / state filters at the DB level
    const { q, state } = req.query || {};

    // Base query – CHANGE column + table names to match your schema.
    // The important part is the aliases (AS "...") so the keys
    // match what your current front-end uses.
    const values = [];
    const where = [];

    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      where.push(
        `(LOWER(hsname) LIKE $${values.length} OR LOWER(city) LIKE $${values.length})`
      );
    }

    if (state) {
      values.push(state.toUpperCase());
      where.push(`state_abbr = $${values.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        hs_id,
        hsname,
        city,
        regionname,
        state_abbr,

        -- alias DB columns so JSON keys match your current sheet-based code
        yatstats_national_rank   AS "YAT?STATS NATIONAL RANK",
        yatstats_state_rank      AS "YAT?STATS STATE RANK",
        current_active_alumni    AS "Current Active Alumni",
        mlb_players_produced     AS "MLB Players Produced",
        all_time_next_level      AS "All-Time Next Level Alumni",
        drafted_hs               AS "Drafted out of High School",
        drafted_total            AS "Drafted",

        microsite_subdomain      AS "Microsite Sub-Domain"
      FROM hs_baseball_programs
      ${whereClause}
      ORDER BY hsname ASC
      LIMIT 20000;
    `;

    const result = await pool.query(sql, values);

    // Return array of row objects
    res.setHeader("Access-Control-Allow-Origin", "*"); // loosen if needed
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error querying Neon:", err);
    res.status(500).json({ error: "Failed to load HS programs." });
  }
}
