/*
# Persist User Game State to Database

## Overview
Migrates all game progress (XP, level, stats, quests, journal, achievements,
streaks, theme preferences) from localStorage-only to Supabase so data survives
app close, device switch, and reinstall.

## New Tables

### user_game_state
- `user_id` (uuid PK, references auth.users) — one row per user
- `xp` (int, default 0) — total experience points
- `stride_score` (numeric, default 40) — Life Score (0-100)
- `tier` (text, default 'Beginner') — tier name
- `stats` (jsonb) — 8 stat values (strength, intelligence, etc.)
- `daily_quests` (jsonb) — array of quest objects
- `completed_count` (int, default 0) — lifetime completed quest count
- `achievements` (jsonb) — array of unlocked achievement IDs
- `journal` (jsonb) — array of journal entries
- `streak` (int, default 0) — current day streak
- `last_active_date` (text, nullable) — ISO date string of last activity
- `onboarded` (boolean, default false) — whether onboarding is complete
- `starting_headline` (text, nullable) — onboarding result headline
- `starting_reason` (text, nullable) — onboarding result reason
- `goals` (jsonb) — array of goal strings
- `interests` (jsonb) — array of interest strings
- `theme` (text, default 'nebula') — theme preference
- `updated_at` (timestamptz) — last sync time
- `created_at` (timestamptz) — row creation time

## Security (RLS)
- SELECT: user can read only their own game state
- INSERT: user can insert only their own game state
- UPDATE: user can update only their own game state
- DELETE: user can delete only their own game state

## Important Notes
1. All game data is stored as JSONB for flexibility (stats, quests, journal, etc.)
2. The user_id column defaults to auth.uid() so inserts from the client work
   without explicitly passing user_id
3. This table is separate from `profiles` (which holds public-facing data like
   username and avatar) — game state is private to each user
*/

CREATE TABLE IF NOT EXISTS user_game_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  stride_score numeric NOT NULL DEFAULT 40,
  tier text NOT NULL DEFAULT 'Beginner',
  stats jsonb NOT NULL DEFAULT '{"strength":40,"intelligence":45,"health":50,"discipline":40,"social":45,"creativity":40,"wealth":30,"athleticism":40}'::jsonb,
  daily_quests jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_count integer NOT NULL DEFAULT 0,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  journal jsonb NOT NULL DEFAULT '[]'::jsonb,
  streak integer NOT NULL DEFAULT 0,
  last_active_date text,
  onboarded boolean NOT NULL DEFAULT false,
  starting_headline text,
  starting_reason text,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme text NOT NULL DEFAULT 'nebula',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_game_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_game_state" ON user_game_state;
CREATE POLICY "select_own_game_state"
ON user_game_state FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_game_state" ON user_game_state;
CREATE POLICY "insert_own_game_state"
ON user_game_state FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_game_state" ON user_game_state;
CREATE POLICY "update_own_game_state"
ON user_game_state FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_game_state" ON user_game_state;
CREATE POLICY "delete_own_game_state"
ON user_game_state FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
