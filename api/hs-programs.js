// /api/hs-programs.js
// Node (CommonJS) handler using @neondatabase/serverless

const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NEON_DATABASE_URL);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { q, state, page = '1', pageSize = '24' } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(pageSize, 10) || 24, 1), 100);
    const offset = (pageNum - 1) * perPage;

    // Base WHERE pieces
    const where = [];
    const params = [];

    if (q && q.trim() !== '') {
      params.push(`%${q.trim().toLowerCase()}%`);
      where.push(`LOWER(s.hsname) LIKE $${params.length}`);
    }

    if (state && state !== 'all') {
      // state is encoded inside yatstats_state_rank like "1 (AZ)"
      params.push(`%(${state})%`);
      where.push(`stats.yatstats_state_rank LIKE $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Count first
    const countRows = await sql(
      `
      SELECT COUNT(*)::int AS count
      FROM tbc_schools_raw s
      LEFT JOIN yatstats_school_stats stats
        ON stats.hsid = s.hsid
      ${whereSql}
      `,
      params
    );

    const total = countRows[0]?.count || 0;
    const totalPages = total === 0 ? 1 : Math.ceil(total / perPage);

    // Now fetch the page of results
    params.push(perPage);
    params.push(offset);

    const limitIdx = params.length - 1;
    const sizeIdx = params.length - 2;

    const rows = await sql(
      `
      SELECT
        s.hsid,
        s.hsname,
        s.cityname   AS city,
        s.state_name AS state,
        COALESCE(stats.current_active_alumni, 0)         AS current_active_alumni,
        COALESCE(stats.mlb_players_produced, 0)          AS mlb_players_produced,
        COALESCE(stats.yatstats_national_rank, 0)        AS national_rank,
        COALESCE(stats.yatstats_state_rank, '-')         AS state_rank,
        COALESCE(stats.all_time_next_level_alumni, 0)    AS all_time_next_level_alumni,
        COALESCE(stats.drafted_out_of_high_school, 0)    AS drafted_hs,
        COALESCE(stats.drafted_total, 0)                 AS drafted_total,
        stats.microsite_url,
        stats.staging_url
      FROM tbc_schools_raw s
      LEFT JOIN yatstats_school_stats stats
        ON stats.hsid = s.hsid
      ${whereSql}
      ORDER BY
        -- show ranked schools first, then by hsname
        (stats.yatstats_national_rank IS NULL) ASC,
        stats.yatstats_national_rank ASC NULLS LAST,
        s.hsname ASC
      LIMIT $${sizeIdx} OFFSET $${limitIdx}
      `,
      params
    );

    res.status(200).json({
      page: pageNum,
      pageSize: perPage,
      total,
      totalPages,
      programs: rows.map(r => ({
        hsid: r.hsid,
        hsname: r.hsname,
        city: r.city,
        state: r.state,
        currentActiveAlumni: r.current_active_alumni,
        mlbPlayersProduced: r.mlb_players_produced,
        nationalRank: r.national_rank,
        stateRank: r.state_rank,
        allTimeNextLevelAlumni: r.all_time_next_level_alumni,
        draftedHs: r.drafted_hs,
        draftedTotal: r.drafted_total,
        micrositeUrl: r.microsite_url,
        stagingUrl: r.staging_url
      }))
    });
  } catch (err) {
    console.error('Error in /api/hs-programs:', err);
    res.status(500).json({
      error: 'Server error while loading HS programs.',
      message: err.message
    });
  }
};