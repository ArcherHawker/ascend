/*
# Profiles, Reports, and Moderation System

## Overview
Creates the full user safety and moderation infrastructure for Ascension:
- `profiles` — public user data (username, avatar, account status)
- `reports` — user-submitted reports for moderation review
- `moderation_log` — admin action audit trail

## New Tables

### profiles
- `id` (uuid PK, references auth.users) — one row per user
- `username` (text, unique) — display name, moderated
- `avatar_url` (text, nullable) — URL to profile picture
- `avatar_moderated` (boolean, default true) — whether avatar passed moderation
- `role` (text, default 'user') — 'user' | 'admin'
- `status` (text, default 'active') — 'active' | 'warned' | 'suspended' | 'banned'
- `warning_message` (text, nullable) — last warning text from admin
- `suspended_until` (timestamptz, nullable) — suspension end time
- `created_at` (timestamptz)

### reports
- `id` (uuid PK)
- `reported_user_id` (uuid, references profiles) — the user being reported
- `reporter_user_id` (uuid, references auth.users) — who submitted
- `reason` (text) — 'inappropriate_username' | 'inappropriate_avatar' | 'harassment' | 'cheating' | 'spam' | 'other'
- `description` (text, nullable) — optional additional details
- `status` (text, default 'pending') — 'pending' | 'reviewed' | 'resolved'
- `created_at` (timestamptz)
- `resolved_at` (timestamptz, nullable)
- `admin_notes` (text, nullable) — admin's notes when resolving

### moderation_log
- `id` (uuid PK)
- `admin_id` (uuid, references auth.users) — admin who took action
- `target_user_id` (uuid, references profiles) — user acted upon
- `action` (text) — 'remove_avatar' | 'change_username' | 'warn' | 'suspend' | 'ban' | 'unban' | 'unsuspend'
- `details` (text, nullable) — context (e.g. new username, warning text)
- `created_at` (timestamptz)

## Security (RLS)

### profiles
- SELECT: anyone authenticated can read public profile data
- INSERT: users can insert their own profile row only
- UPDATE: users can update their own profile; admins can update any profile
- DELETE: blocked

### reports
- SELECT: admins can read all reports; users can read their own submitted reports
- INSERT: any authenticated user can submit a report
- UPDATE: only admins can change report status/notes
- DELETE: blocked

### moderation_log
- SELECT/INSERT: admins only

### Admin detection
Admin status is determined by `profiles.role = 'admin'`. A helper function
`is_admin()` checks the requesting user's profile role. This is used in RLS policies.
*/

-- ─── profiles table ───
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  avatar_moderated boolean NOT NULL DEFAULT true,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'warned', 'suspended', 'banned')),
  warning_message text,
  suspended_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── reports table ───
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('inappropriate_username', 'inappropriate_avatar', 'harassment', 'cheating', 'spam', 'other')),
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  admin_notes text
);

-- ─── moderation_log table ───
CREATE TABLE IF NOT EXISTS moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('remove_avatar', 'change_username', 'warn', 'suspend', 'ban', 'unban', 'unsuspend')),
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Helper function: is_admin() ───
-- Returns true if the current authenticated user has role = 'admin' in profiles.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ─── Enable RLS on all tables ───
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

-- ─── profiles policies ───
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR is_admin())
WITH CHECK (auth.uid() = id OR is_admin());

-- ─── reports policies ───
DROP POLICY IF EXISTS "reports_select_admin_or_own" ON reports;
CREATE POLICY "reports_select_admin_or_own"
ON reports FOR SELECT
TO authenticated
USING (is_admin() OR reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "reports_insert_any" ON reports;
CREATE POLICY "reports_insert_any"
ON reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin"
ON reports FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ─── moderation_log policies ───
DROP POLICY IF EXISTS "modlog_select_admin" ON moderation_log;
CREATE POLICY "modlog_select_admin"
ON moderation_log FOR SELECT
TO authenticated
USING (is_admin());

DROP POLICY IF EXISTS "modlog_insert_admin" ON moderation_log;
CREATE POLICY "modlog_insert_admin"
ON moderation_log FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles(lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
