/*
# Add Adventure Map, Streak Enhancements, and Mood Tracking

## Overview
Adds new columns to user_game_state for the Adventure Map feature,
enhanced streak tracking (longest streak, freeze tokens), and daily mood check-in.

## Modified Tables

### user_game_state (ALTER)
- `longest_streak` (int, default 0) — user's all-time longest day streak
- `freeze_tokens` (int, default 0) — streak freeze tokens earned via achievements
- `last_freeze_date` (text, nullable) — ISO date of last freeze token use
- `mood` (text, nullable) — current mood: 'great' | 'good' | 'okay' | 'low'
- `mood_date` (text, nullable) — ISO date of last mood check-in
- `adventures` (jsonb, default '[]') — array of completed adventure entries
- `last_recap_week` (text, nullable) — ISO date of last weekly recap dismissal

## Security
- No policy changes — existing RLS policies on user_game_state already cover all columns.
- Users can only read/write their own row (auth.uid() = user_id).
*/

ALTER TABLE user_game_state
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freeze_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_freeze_date text,
  ADD COLUMN IF NOT EXISTS mood text,
  ADD COLUMN IF NOT EXISTS mood_date text,
  ADD COLUMN IF NOT EXISTS adventures jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_recap_week text;