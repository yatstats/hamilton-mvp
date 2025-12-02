/// api/hs-programs.js
// HS directory API backed by Neon (Postgres) using tbc_schools_raw.

import { Pool } from "@neondatabase/serverless";

let pool; // lazily initialized

export default async function handler(req, res) {
  try {
    // ---- DB CONNECTION STRING ----
    const connectionString =
      process.env.NEON_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL;

    if (!connectionString) {
      console.error("❌ No Postgres connection string found in env vars.");
      res.status(500).json({
        error: "Missing database connection string.",
      });
      return;
    }

    if (!pool) {
      pool = new Pool({ connectionString });
    }

    // For now, we keep it VERY simple:
    //  - One table: tbc_schools_raw
    //  - Only columns we KNOW exist there
    //  - Fake the stat fields as NULL so the UI shows "-"
    //
    // You told me tbc_schools_raw has (or will have) columns like:
    //   hsid, hsname, cityname, regionname, nickname, color1, color2, color3
    //
    // We alias things so your front-end can keep using its existing keys.

    const sql = `
      SELECT
        s.hsid,
        s.hsname,
        s.cityname       AS city,
        s.regionname     AS regionname,
        s.nickname       AS nickname,
        s.color1,
        s.color2,
        s.color3,

        -- placeholder stats so the UI doesn't explode
        NULL::integer    AS "YAT?STATS NATIONAL RANK",
        NULL::integer    AS "YAT?STATS STATE RANK",
        NULL::integer    AS "Current Active Alumni",
        NULL::integer    AS "MLB Players Produced",
        NULL::integer    AS "All-Time Next Level Alumni",
        NULL::integer    AS "Drafted out of High School",
        NULL::integer    AS "Drafted",

        NULL::text       AS "Microsite Sub-Domain"
      FROM tbc_schools_raw s
      ORDER BY s.hsname ASC
      LIMIT 20000;
    `;

    const result = await pool.query(sql);

    // Allow the front-end to fetch this from your page
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("🔥 Error in /api/hs-programs handler:", err);
    res.status(500).json({
      error: "Server error while loading HS programs.",
      message: err.message,
    });
  }
}
