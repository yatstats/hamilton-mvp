import { neon } from '@neondatabase/serverless';

export const config = {
  maxDuration: 300,
};

const APPROVED_COLLEGE_LEVELS = new Set([
  'NCAA-D1',
  'NCAA-D2',
  'NCAA-D3',
  'NAIA',
  'NJCAA',
  'CCCAA',
  'NWAC',
]);

const sql = neon(process.env.DATABASE_URL || '');

function text(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value)
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
}

function xmlDecode(value) {
  if (!value) return null;
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim() || null;
}

function tagValue(itemXml, tag) {
  const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? text(match[1]) : null;
}

function tagAttr(itemXml, tag, attr) {
  const match = itemXml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, 'i'));
  return match ? xmlDecode(match[1]) : null;
}

function extractItems(xml) {
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) items.push(match[0]);
  if (items.length) return items;
  while ((match = entryRegex.exec(xml)) !== null) items.push(match[0]);
  return items;
}

function hash(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function extractDate(input) {
  if (!input) return null;

  const iso = input.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const slash = input.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`;
  }

  const months = {
    jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
    apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07',
    aug: '08', august: '08', sep: '09', sept: '09', september: '09', oct: '10', october: '10',
    nov: '11', november: '11', dec: '12', december: '12',
  };
  const monthMatch = input.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (monthMatch) {
    const m = months[monthMatch[1].toLowerCase().replace('.', '')];
    return `${monthMatch[3]}-${m}-${monthMatch[2].padStart(2, '0')}`;
  }

  return null;
}

function statusFromText(input) {
  const value = (input || '').toLowerCase();
  if (value.includes('final')) return 'FINAL';
  if (value.includes('cancelled') || value.includes('canceled')) return 'CANCELLED';
  if (value.includes('postponed')) return 'POSTPONED';
  if (value.includes('suspended')) return 'SUSPENDED';
  return 'SCHEDULED';
}

function parseTeams(sourceTeamName, combined) {
  const out = { opponent: null, home_team_name: null, away_team_name: null };
  if (!combined) return out;

  const cleaned = combined.replace(/\s+/g, ' ').replace(/^Baseball:?\s*/i, '').trim();

  const atMatch = cleaned.match(/(.+?)\s+at\s+(.+?)(?:\s+[-|]\s+|$)/i);
  if (atMatch) {
    const away = atMatch[1].trim();
    const home = atMatch[2].trim();
    out.away_team_name = away;
    out.home_team_name = home;
    out.opponent = sourceTeamName && home.toLowerCase().includes(sourceTeamName.toLowerCase()) ? away : home;
    return out;
  }

  const vsMatch = cleaned.match(/(.+?)\s+v(?:s\.?|ersus)\s+(.+?)(?:\s+[-|]\s+|$)/i);
  if (vsMatch) {
    const left = vsMatch[1].trim();
    const right = vsMatch[2].trim();
    out.home_team_name = sourceTeamName || left;
    out.away_team_name = sourceTeamName && left.toLowerCase().includes(sourceTeamName.toLowerCase()) ? right : left;
    out.opponent = out.away_team_name;
    return out;
  }

  return out;
}

function getLink(itemXml) {
  return tagValue(itemXml, 'link') || tagAttr(itemXml, 'link', 'href');
}

function parseFeed(feed, xml) {
  const items = extractItems(xml);
  return items.map((itemXml, idx) => {
    const title = tagValue(itemXml, 'title');
    const description = tagValue(itemXml, 'description') || tagValue(itemXml, 'summary');
    const link = getLink(itemXml);
    const guid = tagValue(itemXml, 'guid') || tagValue(itemXml, 'id') || link || `${feed.teamid}-${idx}-${title || 'game'}`;
    const combined = [title, description].filter(Boolean).join(' ');
    const sourceGameId = hash(`${feed.teamid}|${guid}`);
    const teams = parseTeams(feed.current_team_name, combined);

    return {
      college_game_key: `${feed.teamid}::presto_rss::${sourceGameId}`,
      source_game_id: sourceGameId,
      game_date: extractDate(combined) || extractDate(tagValue(itemXml, 'pubDate')),
      status: statusFromText(combined),
      home_team_name: teams.home_team_name,
      away_team_name: teams.away_team_name,
      opponent: teams.opponent,
      schedule_url: feed.schedule_url || feed.conference_schedule_url || feed.schedule_rss_feed,
      boxscore_url: link && /box|boxscore/i.test(`${link} ${combined}`) ? link : null,
      recap_url: link && /recap|story|news/i.test(`${link} ${combined}`) ? link : null,
      livestats_url: link && /live|stats/i.test(`${link} ${combined}`) ? link : null,
      raw_payload: {
        source: 'presto_rss',
        feed_teamid: feed.teamid,
        feed_team_name: feed.current_team_name,
        title,
        description,
        link,
        guid,
      },
    };
  });
}

async function ensureTables() {
  await sql`
    create table if not exists public.college_schedule_ingestion_log (
      id bigserial primary key,
      teamid text,
      current_team_name text,
      schedule_rss_feed text,
      status text not null,
      games_found integer default 0,
      games_upserted integer default 0,
      error_message text,
      started_at timestamptz not null default now(),
      finished_at timestamptz
    )
  `;

  await sql`
    create unique index if not exists college_schedule_games_raw_game_key_uidx
    on public.college_schedule_games_raw (college_game_key)
  `;
}

async function getFeeds(limit) {
  const rows = await sql`
    select
      teamid::text as teamid,
      current_team_name,
      current_org_or_conference_name,
      level_label,
      schedule_rss_feed,
      schedule_url,
      conference_schedule_url
    from public.teamid_universe_mapping
    where nullif(trim(schedule_rss_feed), '') is not null
      and level_label in ('NCAA-D1', 'NCAA-D2', 'NCAA-D3', 'NAIA', 'NJCAA', 'CCCAA', 'NWAC')
    order by current_org_or_conference_name, current_team_name
  `;

  return Number.isInteger(limit) && limit > 0 ? rows.slice(0, limit) : rows;
}

async function upsertGame(feed, game) {
  await sql`
    insert into public.college_schedule_games_raw (
      college_game_key,
      teamid,
      team,
      source_system,
      source_game_id,
      game_date,
      status,
      home_team_name,
      away_team_name,
      level,
      schedule_url,
      boxscore_url,
      recap_url,
      livestats_url,
      raw_payload,
      updated_at
    ) values (
      ${game.college_game_key},
      ${feed.teamid},
      ${feed.current_team_name},
      'presto_rss',
      ${game.source_game_id},
      ${game.game_date},
      ${game.status},
      ${game.home_team_name},
      ${game.away_team_name},
      ${feed.level_label},
      ${game.schedule_url},
      ${game.boxscore_url},
      ${game.recap_url},
      ${game.livestats_url},
      ${JSON.stringify(game.raw_payload)}::jsonb,
      now()
    )
    on conflict (college_game_key) do update set
      teamid = excluded.teamid,
      team = excluded.team,
      source_system = excluded.source_system,
      source_game_id = excluded.source_game_id,
      game_date = excluded.game_date,
      status = excluded.status,
      home_team_name = excluded.home_team_name,
      away_team_name = excluded.away_team_name,
      level = excluded.level,
      schedule_url = excluded.schedule_url,
      boxscore_url = excluded.boxscore_url,
      recap_url = excluded.recap_url,
      livestats_url = excluded.livestats_url,
      raw_payload = excluded.raw_payload,
      updated_at = now()
  `;
}

function allowed(req) {
  const secret = process.env.ADMIN_INGEST_SECRET;
  if (!secret) return true;

  const querySecret = req.query?.secret;
  const headerSecret = req.headers?.['x-admin-ingest-secret'];
  const auth = req.headers?.authorization;

  return querySecret === secret || headerSecret === secret || auth === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL is missing' });
  }

  if (!allowed(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const startedAt = new Date();
  const limit = req.query?.limit ? Number(req.query.limit) : null;

  try {
    await ensureTables();
    const feeds = await getFeeds(Number.isFinite(limit) ? limit : null);
    const results = [];

    for (const feed of feeds) {
      const feedStartedAt = new Date();

      try {
        const response = await fetch(feed.schedule_rss_feed, {
          headers: {
            'user-agent': 'YATSTATS college schedule ingestion/1.0',
            accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const xml = await response.text();
        const games = parseFeed(feed, xml);
        let upserted = 0;

        for (const game of games) {
          await upsertGame(feed, game);
          upserted += 1;
        }

        await sql`
          insert into public.college_schedule_ingestion_log (
            teamid,
            current_team_name,
            schedule_rss_feed,
            status,
            games_found,
            games_upserted,
            started_at,
            finished_at
          ) values (
            ${feed.teamid},
            ${feed.current_team_name},
            ${feed.schedule_rss_feed},
            'success',
            ${games.length},
            ${upserted},
            ${feedStartedAt.toISOString()},
            now()
          )
        `;

        results.push({
          teamid: feed.teamid,
          team: feed.current_team_name,
          status: 'success',
          games_found: games.length,
          games_upserted: upserted,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        await sql`
          insert into public.college_schedule_ingestion_log (
            teamid,
            current_team_name,
            schedule_rss_feed,
            status,
            games_found,
            games_upserted,
            error_message,
            started_at,
            finished_at
          ) values (
            ${feed.teamid},
            ${feed.current_team_name},
            ${feed.schedule_rss_feed},
            'error',
            0,
            0,
            ${message},
            ${feedStartedAt.toISOString()},
            now()
          )
        `;

        results.push({
          teamid: feed.teamid,
          team: feed.current_team_name,
          status: 'error',
          games_found: 0,
          games_upserted: 0,
          error: message,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      job: 'college_schedule_rss_ingestion',
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      feeds_checked: results.length,
      successful_feeds: results.filter((r) => r.status === 'success').length,
      failed_feeds: results.filter((r) => r.status === 'error').length,
      games_found: results.reduce((sum, r) => sum + r.games_found, 0),
      games_upserted: results.reduce((sum, r) => sum + r.games_upserted, 0),
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ ok: false, error: message });
  }
}
