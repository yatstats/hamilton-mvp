# YAT?STATS — Verified College Flip Card Workflow Proposal

**Date:** 2026-04-02  
**Scope:** Hamilton High School (hsid=5004) pilot — scalable to all 1,024 microsites

---

## 1. Source of Truth Hierarchy

After a full data investigation using the live database, the correct source-of-truth hierarchy is:

| Priority | Source | What It Provides |
|----------|--------|-----------------|
| 1 (Authoritative) | `player_seasons` (TBC feed) | Player's **current team** for a given season year, with verified `teamid` |
| 2 (Reference) | `tbc_college_teams_map_raw` | Maps every `teamid` to full college name, short name, nickname, location |
| 3 (Display) | `flip_card_front_stage` | Current display state of each player's flip card |
| 4 (Roster/Schedule) | `college_roster_players_raw` + `college_schedule_games_raw` | Seeded roster and schedule data for teams we actively track |
| 5 (Historical) | Hamilton All-Time Next-Level List | Historical record of where players attended — NOT reliable for current team |

**Key insight:** `player_seasons` is the only table that definitively answers "what team is this player on in 2026?" It is populated from the TBC live feeds and is already in the database. All other sources are secondary.

---

## 2. Verified 2026 Active Hamilton College Players

Using `player_seasons` (season='2026') joined with `flip_card_front_stage` (hsid=5004, ACTIVE, college level), here are the **18 confirmed active college players** with their verified TBC teamids:

| Player | Class | Level | TBC teamid | College | In college_team_sources? | Roster | Schedule |
|--------|-------|-------|-----------|---------|--------------------------|--------|---------|
| Boston Kellner | 2025 | NCAA-D1 | **20023** | Texas A&M University | ❌ MISSING | 0 | 0 |
| Caden Burghardt | 2024 | NCAA-D2 | 21405 | Colorado School of Mines | ✅ | 47 | 49 |
| Drew Rogers | 2024 | NCAA-D1 | 20124 | Georgia Tech | ✅ | 42 | 61 |
| Liam Wilson | 2024 | NCAA-D1 | 20257 | Harvard University | ✅ | 28 | 45 |
| Cooper Brass | 2023 | NCAA-D1 | **20966** | Utah Valley University | ❌ MISSING | 0 | 0 |
| Roch Cholowsky | 2023 | NCAA-D1 | 20054 | UCLA | ✅ | 40 | 19 |
| Carson Johnson | 2023 | NCAA-D1 | **20001** | San Diego State University | ❌ MISSING | 0 | 0 |
| Ryan Kucherak | 2023 | NCAA-D1 | 20037 | Northwestern University | ✅ | 44 | 24 |
| Rohan Lettow | 2023 | NCAA-D1 | **20001** | San Diego State University | ❌ MISSING | 0 | 0 |
| Zach Wadas | 2023 | NCAA-D1 | **20065** | Loyola Marymount University | ❌ MISSING | 0 | 0 |
| Prince DeBoskie | 2022 | NCAA-D1 | **20438** | University of Akron | ❌ MISSING | 0 | 0 |
| Jeremy Jones | 2022 | NCAA-D1 | **20103** | Ball State University | ❌ MISSING | 0 | 0 |
| Kole Klecker | 2022 | NCAA-D1 | 20021 | Arizona State University | ✅ | 73 | 75 |
| Jackson Smith | 2022 | NCAA-D1 | **20005** | Southern Illinois University | ❌ MISSING | 0 | 0 |
| DJ Barrett | 2021 | NCAA-D2 | **20415** | Northwestern Oklahoma State | ❌ MISSING | 0 | 0 |
| Luke Thiele | 2021 | NCAA-D1 | 20057 | Washington State University | ✅ | 39 | 53 |
| Braden Watkins | 2021 | NCAA-D2 | **20976** | Arkansas Tech University | ❌ MISSING | 0 | 0 |
| Shane Anderson | 2020 | NAIA | 22426 | Georgia Gwinnett College | ✅ | 35 | 61 |

**4 additional players** are active college players but have no 2026 season entry in `player_seasons` yet (TBC feed may not have updated them):

| Player | Class | Level | Last Known Team (2025) | teamid | In DB? |
|--------|-------|-------|----------------------|--------|--------|
| AJ Diaz | 2024 | JUCO | Yavapai College | 20252 | ✅ |
| Will Shelor | 2023 | NCAA-D3 | Chandler-Gilbert CC | 20908 | ✅ |
| Logan Saloman | 2022 | NCAA-D1 | University of Nevada | 20255 | ✅ |
| Alex Hernandez | 2021 | NCAA-D2 | Adams State University | 21264 | ✅ |

> **Note on these 4:** Their `flip_card_front_stage` shows them as active college players, but `player_seasons` has no 2026 record. This means either: (a) TBC hasn't published their 2026 stats yet, or (b) they transferred to a team not yet in the TBC feed. The flip card display data (`current_team_name`) should be treated as the best available truth until TBC updates.

---

## 3. Teams That Need to Be Added to `college_team_sources`

**10 teams** are confirmed active in 2026 for Hamilton players but are missing from `college_team_sources`:

| teamid | College | Player(s) | Notes |
|--------|---------|-----------|-------|
| 20023 | Texas A&M University | Boston Kellner | SEC — SIDEARM site |
| 20966 | Utah Valley University | Cooper Brass | WAC — SIDEARM site |
| 20001 | San Diego State University | Carson Johnson, Rohan Lettow | Big 12 — SIDEARM site |
| 20065 | Loyola Marymount University | Zach Wadas | WCC — SIDEARM site |
| 20438 | University of Akron | Prince DeBoskie | MAC — SIDEARM site |
| 20103 | Ball State University | Jeremy Jones | MAC — SIDEARM site |
| 20005 | Southern Illinois University | Jackson Smith | MAC — SIDEARM site |
| 20415 | Northwestern Oklahoma State | DJ Barrett | GAC — SIDEARM site |
| 20976 | Arkansas Tech University | Braden Watkins | GAC — SIDEARM site |
| 20908 | Chandler-Gilbert CC | Will Shelor (2025) | ACCAC — already in DB! |

> **Correction:** Chandler-Gilbert CC (20908) IS already in `college_team_sources` — it was one of the original 21 teams. Will Shelor's 2025 data is there. The flip card shows him at Pacific University (NCAA-D3) but `player_seasons` only has him at CGCC through 2025. This needs manual verification.

---

## 4. Teams in `college_team_sources` That Have No Active 2026 Hamilton Players

These 9 teams were seeded but have no verified 2026 Hamilton players per `player_seasons`:

| teamid | Team | Why It Was Seeded | Recommendation |
|--------|------|------------------|----------------|
| 20125 | Grand Canyon University | Geographic assumption | Keep — Tyler Wilson (2020) was there; may have future alumni |
| 22004 | Hannibal-LaGrange College | Zachary Johnston (RETIRED) | Keep — low cost, data is there |
| 20272 | Oregon State University | Gavin Turley (drafted 2022) | Keep — high-profile program |
| 20433 | Texas Christian University | Kole Klecker (transferred to ASU) | Keep — Klecker's prior stats are here |
| 20026 | University of Arizona | Carson Johnson (transferred to SDSU) | Keep — prior stats for Johnson |
| 20266 | University of New Mexico | Cooper Brass (transferred to UVU) | Keep — prior stats for Brass |
| 20252 | Yavapai College | AJ Diaz (2025 data) | Keep — AJ Diaz's 2025 stats are here |
| 20908 | Chandler-Gilbert CC | Multiple players' prior seasons | Keep — Will Shelor 2025 data |
| 21995 | Gateway Community College | Multiple players' prior seasons | Keep — transfer path data |

**Recommendation: Keep all 9.** They represent valid transfer path data and prior season stats. The cost of keeping them is minimal; the cost of deleting and re-seeding later is high.

---

## 5. The Scalable Workflow

### Step 1: Dynamic Team Discovery (runs before roster/schedule seeding)

```sql
-- Query to automatically identify all teams needing to be in college_team_sources
-- for any given high school (hsid)
SELECT DISTINCT
  ps.teamid,
  ct.collegename,
  ct.collegeshort,
  ct.locationlong,
  MAX(ps.season) as latest_season,
  COUNT(DISTINCT ps.playerid) as player_count
FROM player_hsid_metadata phm
JOIN player_seasons ps ON ps.playerid = phm.playerid::text
JOIN tbc_college_teams_map_raw ct ON ct.teamid = ps.teamid
WHERE phm.hsid = :hsid
  AND ps.season >= (EXTRACT(YEAR FROM NOW()) - 1)::text  -- current + prior year
GROUP BY ps.teamid, ct.collegename, ct.collegeshort, ct.locationlong
ORDER BY latest_season DESC, player_count DESC;
```

This query is the **foundation of the scalable system**. For any school's hsid, it returns the exact set of college teams that need to be in `college_team_sources`. No assumptions. No manual lists.

### Step 2: Auto-populate `college_team_sources`

When a team is returned by Step 1 but is not in `college_team_sources`, insert it:

```sql
INSERT INTO college_team_sources (teamid, team, source_system, discovery_status)
SELECT 
  ct.teamid,
  ct.collegename,
  'tbc_feed',
  'pending'
FROM tbc_college_teams_map_raw ct
WHERE ct.teamid = :new_teamid
ON CONFLICT (teamid) DO NOTHING;
```

Then trigger roster and schedule URL discovery for the new team.

### Step 3: Roster & Schedule Seeding

For each new team in `college_team_sources` with `discovery_status = 'pending'`:
1. Look up the team's athletic website URL (can be derived from SIDEARM patterns or searched)
2. Seed roster into `college_roster_players_raw`
3. Seed schedule into `college_schedule_games_raw`
4. Update `discovery_status = 'complete'`

### Step 4: Player Matching

```sql
-- Match college roster players to flip card players for a given hsid
UPDATE college_roster_players_raw r
SET 
  matched_playerid = f.playerid,
  matched_hsid = :hsid,
  match_status = 'matched',
  match_score = 95.00
FROM flip_card_front_stage f
JOIN player_seasons ps ON ps.playerid = f.playerid AND ps.season = '2026'
WHERE ps.teamid = r.teamid
  AND f.hsid = :hsid
  AND LOWER(r.first_name) = LOWER(f.first_name)
  AND LOWER(r.last_name) = LOWER(f.last_name)
  AND r.match_status IS NULL;
```

### Step 5: Daily Flip Card Update (GitHub Actions — 6 AM MST)

The existing `scripts/update_college_flip_cards.py` script handles this step. It:
1. Finds all matched players for the given hsid
2. Queries `college_schedule_games_raw` for next game and last 3 games
3. Updates `flip_card_front_stage` with the results

---

## 6. What Needs to Happen Now (Hamilton Pilot)

**Immediate actions (in order):**

1. **Add 9 missing teams** to `college_team_sources` using the verified teamids from `player_seasons`
2. **Seed rosters and schedules** for those 9 teams
3. **Run player matching** for all newly seeded teams
4. **Verify the 4 players** without 2026 `player_seasons` entries (AJ Diaz, Will Shelor, Logan Saloman, Alex Hernandez) — check if their `flip_card_front_stage` team matches their last known TBC team
5. **Run the daily update script** to populate next game and last 3 games for all matched players

**Teams to add:**

| teamid | College | SIDEARM URL Pattern |
|--------|---------|---------------------|
| 20023 | Texas A&M | 12thman.com/sports/baseball |
| 20966 | Utah Valley University | gouvu.com/sports/baseball |
| 20001 | San Diego State University | goaztecs.com/sports/baseball |
| 20065 | Loyola Marymount University | lmulions.com/sports/baseball |
| 20438 | University of Akron | gozips.com/sports/baseball |
| 20103 | Ball State University | ballstatesports.com/sports/baseball |
| 20005 | Southern Illinois University | siusalukis.com/sports/baseball |
| 20415 | Northwestern Oklahoma State | nwosu.edu/athletics/baseball |
| 20976 | Arkansas Tech University | atuwonder boys.com/sports/baseball |

---

## 7. Scaling to All 1,024 Microsites

The workflow above is fully school-agnostic. To scale:

1. Run the **Step 1 discovery query** for each hsid in `schools` where `active = true`
2. Auto-insert any new teams into `college_team_sources`
3. Trigger roster/schedule seeding for new teams (can be parallelized)
4. Run player matching for each hsid
5. The daily GitHub Actions workflow handles all schools simultaneously (filter by hsid or run for all)

The only bottleneck is roster/schedule seeding for new teams — which is a one-time cost per team, not per school. Once a team like Texas A&M is seeded, it serves all 1,024 microsites that have alumni there.

---

*Document generated: 2026-04-02 | YAT?STATS Platform*
