# College Flip Card Automation — YAT?STATS

## Overview

This document describes the automated daily workflow that populates college player data on Hamilton High School alumni flip cards on the YAT?STATS platform.

The system answers the question **"WHERE THEY YAT?"** for the 21 college teams that Hamilton (hsid=5004) alumni currently play for, showing fans:
- **Next upcoming game** (date, home/away, opponent)
- **Last 3 game results** (line scores: W/L + run totals)

---

## Architecture

```
college_roster_players_raw   ←→   flip_card_front_stage
   (matched_playerid,                (playerid, hsid,
    matched_hsid='5004')              next_game_*, lg1/2/3_*)
         ↑                                   ↑
college_schedule_games_raw          GitHub Actions
   (game_date, home/away,           (runs daily 6AM MST)
    scores, opponent names)
```

---

## Files

| File | Purpose |
|------|---------|
| `scripts/update_college_flip_cards.py` | Main Python script — queries DB, computes next game + last 3 games, updates flip_card_front_stage |
| `scripts/requirements.txt` | Python dependencies (psycopg2-binary) |
| `.github/workflows/update-college-flip-cards.yml` | GitHub Actions workflow — runs daily at 6:00 AM MST |

---

## Setup Instructions

### 1. Add the DATABASE_URL Secret to GitHub

This is the **only manual step** required before the automation runs.

1. Go to: https://github.com/yatstats/hamilton-mvp/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `DATABASE_URL`
4. Value: Your Neon PostgreSQL connection string:
   ```
   postgresql://authenticator:<password>@ep-tiny-bird-a44r67gp-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
5. Click **"Add secret"**

### 2. Add the GitHub Actions Workflow File

Because GitHub requires the `workflows` permission to push `.github/workflows/` files via API, you must add the workflow file manually:

1. In GitHub, navigate to your repo
2. Create the file `.github/workflows/update-college-flip-cards.yml`
3. Paste the contents from the workflow YAML below

### 3. Merge the Branch

Merge `feature/college-flip-card-automation` into `main` (or your target branch).

---

## GitHub Actions Workflow YAML

Save this as `.github/workflows/update-college-flip-cards.yml`:

```yaml
name: Update College Flip Cards

# Runs daily at 6:00 AM MST (13:00 UTC)
# Also supports manual trigger with optional dry-run mode
on:
  schedule:
    - cron: "0 13 * * *"   # 6:00 AM MST / 7:00 AM MDT daily
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry run (preview only, no DB writes)"
        required: false
        default: "false"
        type: choice
        options:
          - "false"
          - "true"
      hsid:
        description: "High school ID to process (default: 5004 = Hamilton)"
        required: false
        default: "5004"

jobs:
  update-flip-cards:
    name: Update College Player Flip Cards
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: |
          pip install psycopg2-binary

      - name: Run flip card update (scheduled)
        if: github.event_name == 'schedule'
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          python scripts/update_college_flip_cards.py --hsid 5004

      - name: Run flip card update (manual dispatch)
        if: github.event_name == 'workflow_dispatch'
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          ARGS="--hsid ${{ github.event.inputs.hsid || '5004' }}"
          if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
            ARGS="$ARGS --dry-run"
          fi
          python scripts/update_college_flip_cards.py $ARGS

      - name: Report completion
        if: always()
        run: |
          echo "Workflow completed at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
```

---

## How the Matching Works

### Current Match Status (Hamilton hsid=5004)

**9 confirmed exact-name matches** found between Hamilton alumni in `flip_card_front_stage` and players in `college_roster_players_raw`:

| Player | College Team | Jersey | Position | Hometown |
|--------|-------------|--------|----------|---------|
| Shane Anderson | Georgia Gwinnett College | #44 | RHP | Chandler |
| Roch Cholowsky | UCLA | #1 | INF | Chandler |
| Alex Hernandez | Georgia Tech | #4 | RHP/UTL | Cumming, GA |
| Zachary Johnston | Hannibal-LaGrange College | #16 | OF | Chandler |
| Kole Klecker | Arizona State University | #27 | RHP | Chandler |
| Ryan Kucherak | Northwestern University | #17 | INF | — |
| Drew Rogers | Georgia Tech | #34 | C/INF | Tempe, AZ |
| Luke Thiele | Washington State University | #1 | MIF | Chandler |
| Liam Wilson | Harvard University | #29 | C/1B/OF | Chandler |

These matches are stored in `college_roster_players_raw` with:
- `match_status = 'matched'`
- `matched_playerid` = the playerid from `flip_card_front_stage`
- `matched_hsid = '5004'`
- `match_score = 95.00`

### Adding More Matches

To add more players as matches are confirmed:

```sql
UPDATE college_roster_players_raw
SET 
  matched_playerid = '<playerid>',
  matched_hsid = '5004',
  match_status = 'matched',
  match_score = 95.00,
  updated_at = now()
WHERE roster_player_key = '<roster_player_key>';
```

The daily workflow will automatically pick up any new matches on its next run.

---

## Data Quality Notes

### Known Issues to Address

| Issue | Affected Teams | Fix |
|-------|---------------|-----|
| Opponent names truncated (e.g., "San" instead of "San Jose State") | WSU, others with ICS feeds | ICS feeds sometimes truncate long event titles — consider re-scraping HTML schedule pages for opponent names |
| No completed game scores | UCLA, Georgia Tech | ICS feeds only had future games; no historical scores were captured. Will resolve naturally as season progresses |
| "Unknown Opponent" in schedule | Northwestern | ICS event had no opponent name in SUMMARY field |
| Zachary Johnston's last game shows "Hannibal-LaGrange College" as opponent | Hannibal-LaGrange | The schedule data has the team as both home_team_name and away_team_name for some games — home_team_id lookup needed |

### Schedule Data Coverage

The `college_schedule_games_raw` table contains **1,277 total games** across all 21 teams. For the 9 matched Hamilton players, schedule coverage is:

- **Full coverage with scores**: Shane Anderson (GGC), Zachary Johnston (HLG), Ryan Kucherak (NU), Liam Wilson (Harvard)
- **Future games only, no scores yet**: Kole Klecker (ASU), Luke Thiele (WSU)
- **Missing schedule data**: Roch Cholowsky (UCLA), Alex Hernandez (Georgia Tech), Drew Rogers (Georgia Tech)

---

## Running Manually

### Dry Run (preview only)
```bash
DATABASE_URL="<your-connection-string>" python scripts/update_college_flip_cards.py --hsid 5004 --dry-run
```

### Live Run
```bash
DATABASE_URL="<your-connection-string>" python scripts/update_college_flip_cards.py --hsid 5004
```

### Run for a Different School
```bash
DATABASE_URL="<your-connection-string>" python scripts/update_college_flip_cards.py --hsid <other_hsid>
```

---

## Expanding to Other Schools (Future)

The script is designed to be school-agnostic. To expand beyond Hamilton:

1. Seed college rosters for the new school's teams into `college_roster_players_raw`
2. Run the name-matching query to find alumni on those rosters
3. Update `match_status = 'matched'` and `matched_hsid = '<new_hsid>'` for confirmed matches
4. The daily workflow will automatically include those players on the next run

This is the foundation for scaling to all 1,024 microsites and 40K+ players.

---

## Player Profile Page (Future — `integrate/final_shell_profile` branch)

The player profile page will need the following data points, all of which are now available in the database:

| Data Point | Source Table | Key Fields |
|-----------|-------------|-----------|
| Player headshot | `college_roster_players_raw` | `headshot_url` |
| Current team + position | `college_roster_players_raw` | `team`, `position`, `jersey_number` |
| Class year / grad year | `college_roster_players_raw` | `class_year` |
| Next game | `flip_card_front_stage` | `next_game_date`, `next_game_opponent`, `next_game_home_away` |
| Last 3 game line scores | `flip_card_front_stage` | `lg1_*`, `lg2_*`, `lg3_*` |
| Full season schedule | `college_schedule_games_raw` | All games for `teamid` |
| HS career stats | `tbc_batting_raw`, `tbc_pitching_raw` | Filtered by `playerid` |

---

*Last updated: 2026-04-02 | Maintained by YAT?STATS / Arms Reach Digital*
