/*
# User Goals Table + Privacy Settings Columns

## Overview
Adds a structured goals system with progress tracking, deadlines, and XP rewards.
Also adds privacy control columns to profiles so users can control what
information is visible to friends and on leaderboards.

## New Tables

### user_goals
- `id` (uuid, primary key)
- `user_id` (uuid, FK to auth.users, defaults to auth.uid())
- `title` (text, not null) — goal name e.g. "Improve soccer skills"
- `icon` (text, default '🎯') — emoji icon
- `category` (text, default 'general') — stat category
- `target_value` (int, default 100) — target for progress tracking
- `current_value` (int, default 0) — current progress
- `deadline` (date, nullable) — optional deadline
- `xp_reward` (int, default 50) — XP earned on completion
- `completed` (boolean, default false)
- `completed_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())

## Modified Tables

### profiles (ALTER)
- `public_profile` (boolean, default true) — whether profile is visible to others
- `leaderboard_visible` (boolean, default true) — whether user appears on leaderboards
- `share_stats_with_friends` (boolean, default true) — whether friends can see stats

## Security
- user_goals: RLS enabled, 4 owner-scoped CRUD policies (TO authenticated, auth.uid() = user_id)
- profiles: existing RLS already covers new columns (users update their own row)
*/

CREATE TABLE IF NOT EXISTS user_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  icon text NOT NULL DEFAULT '🎯',
  category text NOT NULL DEFAULT 'general',
  target_value int NOT NULL DEFAULT 100,
  current_value int NOT NULL DEFAULT 0,
  deadline date,
  xp_reward int NOT NULL DEFAULT 50,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_goals" ON user_goals;
CREATE POLICY "select_own_goals" ON user_goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_goals" ON user_goals;
CREATE POLICY "insert_own_goals" ON user_goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_goals" ON user_goals;
CREATE POLICY "update_own_goals" ON user_goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_goals" ON user_goals;
CREATE POLICY "delete_own_goals" ON user_goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS public_profile boolean NOT NULL DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS leaderboard_visible boolean NOT NULL DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS share_stats_with_friends boolean NOT NULL DEFAULT true;