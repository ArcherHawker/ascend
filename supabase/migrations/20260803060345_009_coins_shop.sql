/*
# Add Coins and Rewards Shop Data

## Overview
Adds coins (earned from quests) and shop ownership/equipment data to user_game_state
for the Rewards Shop feature where users buy profile frames, avatar items, themes, and badges.

## Modified Tables

### user_game_state (ALTER)
- `coins` (int, default 0) — currency earned by completing quests
- `owned_items` (jsonb, default '[]') — array of purchased shop item IDs
- `equipped_items` (jsonb, default '{}') — map of item category to equipped item ID

## Security
- No policy changes — existing RLS policies cover all columns.
*/

ALTER TABLE user_game_state
  ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owned_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS equipped_items jsonb NOT NULL DEFAULT '{}'::jsonb;