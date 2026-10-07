/*
# Create user_quests table

## Overview
Creates the missing `user_quests` table that is referenced by goals-quests.ts but was never created.
This enables the Supabase-backed quest system where users can create quests linked to their goals.

## New Tables
- `user_quests` — stores individual quests created by users, optionally linked to a goal
  - `id` (uuid, PK)
  - `user_id` (uuid, references auth.users, defaults to auth.uid())
  - `goal_id` (uuid, references user_goals, nullable — quest can be standalone)
  - `title` (text, not null)
  - `description` (text, nullable)
  - `category` (text, not null, default 'general')
  - `custom_category` (text, nullable)
  - `difficulty` (text, not null, default 'medium', check in easy/medium/hard/extreme)
  - `xp_reward` (int, not null, default 30)
  - `coin_reward` (int, not null, default 5)
  - `requirements` (text, nullable)
  - `proof_required` (boolean, not null, default false)
  - `proof_type` (text, nullable, check in photo/text/timer)
  - `proof_data` (text, nullable)
  - `status` (text, not null, default 'available', check in locked/available/active/completed)
  - `completed_at` (timestamptz, nullable)
  - `reward_claimed` (boolean, not null, default false)
  - `created_at` (timestamptz, default now())

## Security
- Enable RLS on `user_quests`
- Owner-scoped CRUD: each authenticated user can only access their own quests
- 4 separate policies (select/insert/update/delete)

## Important Notes
1. `user_id` defaults to `auth.uid()` so frontend inserts that omit user_id still work
2. `goal_id` has ON DELETE CASCADE so deleting a goal removes its quests
*/

CREATE TABLE IF NOT EXISTS user_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES user_goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  custom_category text,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  xp_reward int NOT NULL DEFAULT 30,
  coin_reward int NOT NULL DEFAULT 5,
  requirements text,
  proof_required boolean NOT NULL DEFAULT false,
  proof_type text CHECK (proof_type IS NULL OR proof_type IN ('photo', 'text', 'timer')),
  proof_data text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('locked', 'available', 'active', 'completed')),
  completed_at timestamptz,
  reward_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_quests" ON user_quests;
CREATE POLICY "select_own_quests"
ON user_quests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_quests" ON user_quests;
CREATE POLICY "insert_own_quests"
ON user_quests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_quests" ON user_quests;
CREATE POLICY "update_own_quests"
ON user_quests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_quests" ON user_quests;
CREATE POLICY "delete_own_quests"
ON user_quests FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_goal_id ON user_quests(goal_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_status ON user_quests(status);
