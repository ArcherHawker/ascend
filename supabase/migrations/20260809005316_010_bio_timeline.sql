/*
# Add Bio to Profiles and Level History to Game State

## Overview
Adds a public bio field to profiles for user introductions and a level_history
jsonb column to user_game_state for the Life Timeline feature.

## Modified Tables

### profiles (ALTER)
- `bio` (text, nullable) — short public bio users can write about themselves

### user_game_state (ALTER)
- `level_history` (jsonb, default '[]') — array of { level, date, xp } entries
  recording each level-up milestone for the Life Timeline

## Security
- No policy changes — existing RLS policies cover all columns.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text;

ALTER TABLE user_game_state
  ADD COLUMN IF NOT EXISTS level_history jsonb NOT NULL DEFAULT '[]'::jsonb;