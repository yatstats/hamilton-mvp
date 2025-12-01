// api/hs-programs.js
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL, // Vercel env var
});

/**
 * Returns all HS programs from Neon in the format
 * your front-end already expects (same keys as the old sheet),
 * PLUS builds the correct CTA button text + URL based on
 * "Current Active Alumni".
 *
 * Tweak table / column names if your Neon schema is different.
 */
export default async function handler(req, res) {
  try {
    const { q, state } = req.query || {};

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

    // 👉 CHANGE table/column names if needed to match Neon
    const sql = `
      SELECT
        hsid,                      -- numeric ID like 5004
        hsname,
        city,
        regionname,
        state_abbr,
        yatstats_national_rank,
        yatstats_state_rank,
        current_active_alumni,
        mlb_players_produced,
        all_time_next_level_alumni,
        drafted_hs,
        drafted_total,
        microsite_subdomain       -- e.g. '5004.yatstats.com' or NULL
      FROM microsite_schools
      ${whereClause}
      ORDER BY hsname ASC
      LIMIT 20000;
    `;

    const result = await pool.query(sql, values);

    const BASE_HOME = "https://yatstats.com";

    // Map DB rows → shape expected by front-end
    const rows = result.rows.map((r) => {
      const active = Number(r.current_active_alumni || 0);

      // Build a microsite URL if we have hsid / subdomain
      const micrositeHost =
        r.microsite_subdomain || (r.hsid ? `${r.hsid}.yatstats.com` : null);
      const micrositeUrl = micrositeHost
        ? `https://${micrositeHost}`
        : BASE_HOME;

      let ctaText;

      if (active >= 14) {
        // 🎯 Tier 1 – 14+ active alumni → full microsite
        ctaText =
          `CLICK TO ENTER THE YAT?STATS GLOBAL NETWORK THROUGH > ${micrositeUrl}`;
      } else if (active >= 1) {
        // 🧲 Tier 2 – 1–13 active alumni → SuperFan / “no microsite yet” funnel
        ctaText =
          "SORRY :(  THIS PROGRAM WAS NOT SELECTED TO RECIEVE A YAT?STATS MICROSITE - " +
          "LOOKING FOR A SPECIFIC PLAYER? CLICK TO SEARCH OUR GLOBAL PLAYER DATABASE " +
          BASE_HOME;
      } else {
        // 🧲 Tier 3 – 0 active alumni → generic info / contact funnel
        ctaText =
          "UNFORTUNATELY OUR RECORDS SHOW THIS PROGRAM DOES NOT HAVE ANY ACTIVE ALUMNI " +
          "CURRENTLY PLAYING AT THE COLLEGE OR PRO LEVELS -  PLEASE CONTACT US IF YOU THINK WE ARE WRONG. " +
          BASE_HOME;
      }

      // 👇 Keys here are EXACTLY what the front-end expects
      return {
        hs_id: r.hsid,
        hsname: r.hsname,
        city: r.city,
        regionname: r.regionname,
        state_abbr: r.state_abbr,

        "YAT?STATS NATIONAL RANK": r.yatstats_national_rank,
        "YAT?STATS STATE RANK": r.yatstats_state_rank,
        "Current Active Alumni": r.current_active_alumni,
        "MLB Players Produced": r.mlb_players_produced,
        "All-Time Next Level Alumni": r.all_time_next_level_alumni,
        "Drafted out of High School": r.drafted_hs,
        Drafted: r.drafted_total,

        // This is where the BUTTON TEXT comes from
        // (front-end already uses this via getCtaData)
        "Microsite Sub-Domain": ctaText,
      };
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error querying Neon:", err);
    res
      .status(500)
      .json({ error: "Failed to load HS programs from Neon." });
  }
}
