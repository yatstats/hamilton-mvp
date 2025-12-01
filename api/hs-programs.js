// api/hs-programs.js
// HS search API using your Neon/Postgres data

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // same as players API
});

export default async function handler(req, res) {
  try {
    const client = await pool.connect();

    try {
      // For now: pull basic school info from tbc_schools_raw.
      // We alias columns so the JSON keys match what your
      // front-end code already expects.
      const { rows } = await client.query(`
        SELECT
          hsid,
          hsname,
          hslocation AS city,      -- e.g. "Chandler, AZ"
          state_name AS regionname,

          -- TEMPORARY placeholders until hs_programs_stats is populated
          0 AS "YAT?STATS NATIONAL RANK",
          0 AS "YAT?STATS STATE RANK",
          0 AS "Current Active Alumni",
          0 AS "MLB Players Produced",
          0 AS "All-Time Next Level Alumni",
          0 AS "Drafted out of High School",
          0 AS "Drafted",

          -- TEMPORARY CTA target: your main funnel / homepage
          'https://yatstats.com' AS "Microsite Sub-Domain"
        FROM tbc_schools_raw
        LIMIT 20000;
      `);

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(200).json(rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("hs-programs API error:", err);
    res.status(500).json({ error: "Failed to load HS programs." });
  }
}
