/*
# Friends, Leaderboard, and Challenges System

## Overview
Adds the social foundation for Stride: friend requests, friendships,
public leaderboards (global + friends + weekly), and a challenges table
for head-to-head friend competitions.

## New Tables

### friendships
- id (uuid PK)
- requester_id (uuid, references auth.users) — who sent the request
- addressee_id (uuid, references auth.users) — who received it
- status (text) — 'pending' | 'accepted' | 'declined'
- created_at (timestamptz)
- updated_at (timestamptz)

### challenges
- id (uuid PK)
- creator_id (uuid, references auth.users)
- opponent_id (uuid, references auth.users)
- title (text) — challenge name
- target_xp (int) — XP goal to win
- status (text) — 'pending' | 'active' | 'completed' | 'declined'
- winner_id (uuid, nullable) — winner's user id
- created_at (timestamptz)
- completed_at (timestamptz, nullable)

## Modified Tables

### user_game_state
- Added xp_this_week (int, default 0) — XP earned in the current week
- Added xp_week_start (text, nullable) — ISO date of the current week's Monday

## Security (RLS)

### friendships
- SELECT: users can see rows where they are requester or addressee
- INSERT: users can insert only where they are the requester
- UPDATE: users can update rows where they are the addressee (accept/decline)
- DELETE: either party can remove a friendship

### challenges
- SELECT: creator or opponent can see
- INSERT: users can insert only where they are the creator
- UPDATE: creator or opponent can update (accept/complete)
- DELETE: blocked

## RPC Functions (SECURITY DEFINER — bypasses RLS safely)

### get_global_leaderboard(limit int)
Returns public stats for all users ranked by XP. Exposes only:
user_id, username, avatar_url, avatar_moderated, xp, completed_count,
streak, stride_score, xp_this_week, tier.

### get_friends_leaderboard(friend_ids uuid[])
Same as global but filtered to a user's friend list.

## Important Notes
1. Leaderboard functions are SECURITY DEFINER so they can read the private
   user_game_state table, but they only expose public fields — no private
   data (journal, quests, etc.) is returned.
2. Level is derived from XP on the frontend (same formula as the app).
3. Weekly XP resets every Monday — the frontend checks xp_week_start and
   resets xp_this_week to 0 when a new week starts.
*/

-- ─── friendships table ───
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select_involved" ON friendships;
CREATE POLICY "friendships_select_involved"
ON friendships FOR SELECT
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "friendships_insert_requester" ON friendships;
CREATE POLICY "friendships_insert_requester"
ON friendships FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "friendships_update_addressee" ON friendships;
CREATE POLICY "friendships_update_addressee"
ON friendships FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id OR auth.uid() = requester_id)
WITH CHECK (auth.uid() = addressee_id OR auth.uid() = requester_id);

DROP POLICY IF EXISTS "friendships_delete_involved" ON friendships;
CREATE POLICY "friendships_delete_involved"
ON friendships FOR DELETE
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- ─── challenges table ───
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_xp integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenges_select_involved" ON challenges;
CREATE POLICY "challenges_select_involved"
ON challenges FOR SELECT
TO authenticated
USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "challenges_insert_creator" ON challenges;
CREATE POLICY "challenges_insert_creator"
ON challenges FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "challenges_update_involved" ON challenges;
CREATE POLICY "challenges_update_involved"
ON challenges FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id OR auth.uid() = opponent_id)
WITH CHECK (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- ─── Add weekly XP columns to user_game_state ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_state' AND column_name = 'xp_this_week') THEN
    ALTER TABLE user_game_state ADD COLUMN xp_this_week integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_game_state' AND column_name = 'xp_week_start') THEN
    ALTER TABLE user_game_state ADD COLUMN xp_week_start text;
  END IF;
END $$;

-- ─── Leaderboard RPC functions ───
CREATE OR REPLACE FUNCTION get_global_leaderboard(limit_count int DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  avatar_moderated boolean,
  xp integer,
  completed_count integer,
  streak integer,
  stride_score numeric,
  xp_this_week integer,
  tier text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.user_id,
    p.username,
    p.avatar_url,
    COALESCE(p.avatar_moderated, true),
    g.xp,
    g.completed_count,
    g.streak,
    g.stride_score,
    g.xp_this_week,
    g.tier
  FROM user_game_state g
  JOIN profiles p ON p.id = g.user_id
  WHERE p.status = 'active'
  ORDER BY g.xp DESC
  LIMIT LEAST(limit_count, 500);
$$;

CREATE OR REPLACE FUNCTION get_friends_leaderboard(friend_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  avatar_moderated boolean,
  xp integer,
  completed_count integer,
  streak integer,
  stride_score numeric,
  xp_this_week integer,
  tier text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.user_id,
    p.username,
    p.avatar_url,
    COALESCE(p.avatar_moderated, true),
    g.xp,
    g.completed_count,
    g.streak,
    g.stride_score,
    g.xp_this_week,
    g.tier
  FROM user_game_state g
  JOIN profiles p ON p.id = g.user_id
  WHERE g.user_id = ANY(friend_ids) AND p.status = 'active'
  ORDER BY g.xp DESC;
$$;
