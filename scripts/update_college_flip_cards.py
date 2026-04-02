#!/usr/bin/env python3
"""
update_college_flip_cards.py
----------------------------
Daily workflow script for YAT?STATS.

For every Hamilton HS (hsid=5004) alumni matched to a college roster player,
this script:
  1. Finds their next upcoming game from college_schedule_games_raw
  2. Finds their last 3 completed games (with scores) from college_schedule_games_raw
  3. Updates flip_card_front_stage with next_game_* and lg1/lg2/lg3 fields

Designed to run daily via GitHub Actions at 6:00 AM MST (13:00 UTC).

Environment variables required:
  DATABASE_URL  - Neon PostgreSQL connection string

Usage:
  python scripts/update_college_flip_cards.py [--hsid 5004] [--dry-run]
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timezone, date
import psycopg2
import psycopg2.extras

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger(__name__)


def get_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise EnvironmentError("DATABASE_URL environment variable is not set.")
    return psycopg2.connect(db_url)


def fetch_matched_players(cur, hsid: int) -> list[dict]:
    """
    Return all college roster players matched to a given high school (hsid).
    Each row includes the player's teamid for schedule lookups.
    """
    cur.execute("""
        SELECT
            r.roster_player_key,
            r.matched_playerid,
            r.matched_hsid,
            r.first_name,
            r.last_name,
            r.teamid,
            r.team,
            r.position,
            r.jersey_number,
            r.class_year,
            r.headshot_url
        FROM college_roster_players_raw r
        WHERE r.match_status = 'matched'
          AND r.matched_hsid = %s
        ORDER BY r.last_name, r.first_name
    """, (str(hsid),))
    return cur.fetchall()


def fetch_next_game(cur, teamid: str) -> dict | None:
    """
    Return the next upcoming game for a team (game_date >= today, no final score yet).
    """
    cur.execute("""
        SELECT
            game_date,
            game_time_utc,
            home_team_id,
            home_team_name,
            away_team_id,
            away_team_name,
            status,
            venue_name
        FROM college_schedule_games_raw
        WHERE teamid = %s
          AND game_date >= CURRENT_DATE
          AND (status IS NULL OR LOWER(status) NOT IN ('f', 'final', 'completed', 'cancelled'))
        ORDER BY game_date ASC, game_time_utc ASC NULLS LAST
        LIMIT 1
    """, (teamid,))
    return cur.fetchone()


def fetch_last_n_games(cur, teamid: str, n: int = 3) -> list[dict]:
    """
    Return the last N completed games for a team (game_date < today, has scores).
    Falls back to any past game if no scored games exist yet.
    """
    # First try: games with actual scores
    cur.execute("""
        SELECT
            game_date,
            home_team_id,
            home_team_name,
            away_team_id,
            away_team_name,
            home_score,
            away_score,
            status
        FROM college_schedule_games_raw
        WHERE teamid = %s
          AND game_date < CURRENT_DATE
          AND home_score IS NOT NULL
          AND away_score IS NOT NULL
        ORDER BY game_date DESC
        LIMIT %s
    """, (teamid, n))
    rows = cur.fetchall()

    if not rows:
        # Fallback: any past game regardless of score
        cur.execute("""
            SELECT
                game_date,
                home_team_id,
                home_team_name,
                away_team_id,
                away_team_name,
                home_score,
                away_score,
                status
            FROM college_schedule_games_raw
            WHERE teamid = %s
              AND game_date < CURRENT_DATE
            ORDER BY game_date DESC
            LIMIT %s
        """, (teamid, n))
        rows = cur.fetchall()

    return rows


def format_line_score(game: dict, teamid: str) -> str:
    """
    Format a game result as a compact line score string.
    e.g. "W 7-3" or "L 2-5" or "4-7" (if no score available)
    """
    home_score = game.get("home_score")
    away_score = game.get("away_score")

    if home_score is None or away_score is None:
        return ""

    is_home = game.get("home_team_id") == teamid
    team_score = home_score if is_home else away_score
    opp_score = away_score if is_home else home_score

    if team_score > opp_score:
        result = "W"
    elif team_score < opp_score:
        result = "L"
    else:
        result = "T"

    return f"{result} {team_score}-{opp_score}"


def get_opponent_name(game: dict, teamid: str) -> str:
    """Return the opponent's name from the perspective of the given team."""
    is_home = game.get("home_team_id") == teamid
    if is_home:
        return game.get("away_team_name") or "TBD"
    else:
        return game.get("home_team_name") or "TBD"


def get_home_away(game: dict, teamid: str) -> str:
    """Return 'H' or 'A' from the perspective of the given team."""
    return "H" if game.get("home_team_id") == teamid else "A"


def build_flip_card_update(player: dict, next_game: dict | None, last_games: list[dict]) -> dict:
    """
    Build the dict of fields to update in flip_card_front_stage for one player.
    """
    teamid = player["teamid"]
    update = {
        "source_refresh_at": datetime.now(timezone.utc),
        "source_notes": f"College schedule auto-updated {date.today().isoformat()}",
        # Clear all game fields first
        "next_game_date": None,
        "next_game_home_away": None,
        "next_game_opponent": None,
        "next_game_time_utc": None,
        "next_game_time_local": None,
        "lg1_date": None, "lg1_home_away": None, "lg1_opponent_abbr": None, "lg1_line": None,
        "lg2_date": None, "lg2_home_away": None, "lg2_opponent_abbr": None, "lg2_line": None,
        "lg3_date": None, "lg3_home_away": None, "lg3_opponent_abbr": None, "lg3_line": None,
    }

    # Next game
    if next_game:
        update["next_game_date"] = next_game["game_date"]
        update["next_game_home_away"] = get_home_away(next_game, teamid)
        update["next_game_opponent"] = get_opponent_name(next_game, teamid)
        update["next_game_time_utc"] = next_game.get("game_time_utc")

    # Last 3 games
    for i, game in enumerate(last_games[:3], start=1):
        update[f"lg{i}_date"] = game["game_date"]
        update[f"lg{i}_home_away"] = get_home_away(game, teamid)
        update[f"lg{i}_opponent_abbr"] = get_opponent_name(game, teamid)
        update[f"lg{i}_line"] = format_line_score(game, teamid)

    return update


def update_flip_card(cur, playerid: str, fields: dict, dry_run: bool = False) -> bool:
    """
    Update flip_card_front_stage for a given playerid.
    Returns True if a row was updated.
    """
    set_clauses = ", ".join([f"{k} = %({k})s" for k in fields.keys()])
    sql = f"""
        UPDATE flip_card_front_stage
        SET {set_clauses},
            updated_at = NOW()
        WHERE playerid = %(playerid)s
    """
    params = {**fields, "playerid": playerid}

    if dry_run:
        log.info(f"[DRY RUN] Would update playerid={playerid}: next_game={fields.get('next_game_date')} opp={fields.get('next_game_opponent')}")
        return True

    cur.execute(sql, params)
    return cur.rowcount > 0


def run(hsid: int = 5004, dry_run: bool = False):
    log.info(f"Starting college flip card update for hsid={hsid} | dry_run={dry_run}")
    today = date.today()
    log.info(f"Today's date: {today}")

    conn = get_connection()
    conn.autocommit = False

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Step 1: Get all matched players for this school
            players = fetch_matched_players(cur, hsid)
            log.info(f"Found {len(players)} matched players for hsid={hsid}")

            if not players:
                log.warning("No matched players found. Run the matching step first.")
                return

            updated = 0
            skipped = 0
            errors = 0

            for player in players:
                playerid = player["matched_playerid"]
                teamid = player["teamid"]
                name = f"{player['first_name']} {player['last_name']}"

                try:
                    # Step 2: Get next game
                    next_game = fetch_next_game(cur, teamid)

                    # Step 3: Get last 3 completed games
                    last_games = fetch_last_n_games(cur, teamid, n=3)

                    # Step 4: Build update fields
                    fields = build_flip_card_update(player, next_game, last_games)

                    # Step 5: Update flip_card_front_stage
                    success = update_flip_card(cur, playerid, fields, dry_run=dry_run)

                    if success:
                        next_str = fields.get("next_game_date") or "TBD"
                        opp_str = fields.get("next_game_opponent") or "—"
                        lg_count = sum(1 for i in range(1, 4) if fields.get(f"lg{i}_date"))
                        log.info(f"  ✓ {name} ({player['team']}) | next={next_str} vs {opp_str} | {lg_count} past games")
                        updated += 1
                    else:
                        log.warning(f"  ✗ {name} — playerid={playerid} not found in flip_card_front_stage")
                        skipped += 1

                except Exception as e:
                    log.error(f"  ERROR processing {name} (playerid={playerid}): {e}")
                    errors += 1

            if not dry_run:
                conn.commit()
                log.info(f"Committed changes to database.")

            log.info(f"\n{'='*50}")
            log.info(f"Summary: {updated} updated | {skipped} skipped | {errors} errors")
            log.info(f"{'='*50}")

    except Exception as e:
        conn.rollback()
        log.error(f"Fatal error: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update college flip cards for YAT?STATS")
    parser.add_argument("--hsid", type=int, default=5004, help="High school ID (default: 5004 = Hamilton)")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to DB")
    args = parser.parse_args()

    run(hsid=args.hsid, dry_run=args.dry_run)
