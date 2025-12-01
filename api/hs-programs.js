// api/hs-programs.js
// HS directory API backed by Neon (Postgres) using tbc_schools_raw.

import { Pool } from "@neondatabase/serverless";

let pool; // lazily initialized so we can handle missing env vars cleanly

export default async function handler(req, res) {
  try {
    // ---- DB CONNECTION STRING ----
    const connectionString =
      process.env.NEON_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL;

    if (!connectionString) {
      console.error(
        "🛑 No DB connection string. Set NEON_DATABASE_URL (or DATABASE_URL / POSTGRES_URL) in Vercel."
      );
      res
        .status(500)
        .json({ error: "DB connection string missing on server." });
      return;
    }

    if (!pool) {
      pool = new Pool({ connectionString });
    }

    // CORS – OK to be open for now
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { q, state } = req.query || {};

    const values = [];
    const where = [];

    // Text search on school name + city
    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      where.push(
        `(LOWER(s.hsname) LIKE $${values.length} OR LOWER(s.cityname) LIKE $${values.length})`
      );
    }

    // 2-letter state filter
    if (state) {
      values.push(state.toUpperCase());
      where.push(`s.state_abbrev = $${values.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        s.hsid,                        -- HS ID
        s.hsname,                      -- school name
        s.cityname      AS city,       -- city
        s.state_name    AS regionname, -- state name
        s.state_abbrev  AS state_abbr,

        -- TEMP placeholder stats until hs_programs_stats is wired:
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
    console.error("🔥 Error in /api/hs-programs handler:", err);
    res.status(500).json({
      error: "Server error while loading HS programs.",
      message: err.message,
    });
  }
}