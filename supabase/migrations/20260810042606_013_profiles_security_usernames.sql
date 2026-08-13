/*
# Fix profiles security: column-level privileges + case-insensitive usernames

## Overview
1. Revokes UPDATE on sensitive columns (role, status, avatar_moderated, warning_message, suspended_until) from authenticated users so they cannot self-escalate to admin or clear their own moderation flags.
2. Adds a SECURITY DEFINER function `update_own_profile` that allows users to update only safe columns (username, display_name, bio, avatar_url, date_of_birth, public_profile, leaderboard_visible, share_stats_with_friends).
3. Adds a case-insensitive unique constraint on usernames so "Archer", "archer", and "ARCHER" are treated as the same username.
4. Adds a trigger that auto-creates a profile row when a new auth.users row is inserted.

## Security Changes
- GRANT UPDATE on only safe columns to authenticated role
- Revoke UPDATE on role, status, avatar_moderated, warning_message, suspended_until from authenticated
- SECURITY DEFINER function for safe self-updates with case-insensitive username uniqueness check

## Important Notes
1. Admin updates (via is_admin()) still work through the existing RLS policy with full column access via the service role or the function.
2. The case-insensitive unique constraint uses a partial unique index on lower(username).
*/

-- ─── Revoke all column privileges from authenticated, then re-grant only safe ones ───
REVOKE UPDATE ON profiles FROM authenticated;

-- Grant UPDATE on only safe columns
GRANT UPDATE (username, display_name, bio, avatar_url, date_of_birth, public_profile, leaderboard_visible, share_stats_with_friends) ON profiles TO authenticated;

-- Grant INSERT on safe columns (for profile creation)
GRANT INSERT (id, username, display_name, bio, avatar_url, date_of_birth, public_profile, leaderboard_visible, share_stats_with_friends) ON profiles TO authenticated;

-- ─── Case-insensitive unique constraint on username ───
-- Drop the non-unique lowercase index, replace with a unique one
DROP INDEX IF EXISTS idx_profiles_username_lower;
CREATE UNIQUE INDEX idx_profiles_username_lower_unique ON profiles (lower(username));

-- ─── SECURITY DEFINER function for safe profile updates ───
-- This allows users to update their own profile's safe columns.
-- Sensitive columns (role, status, avatar_moderated, warning_message, suspended_until)
-- are NOT included and can only be changed by admins via the service role.
CREATE OR REPLACE FUNCTION update_own_profile(
  p_username text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_date_of_birth text DEFAULT NULL,
  p_public_profile boolean DEFAULT NULL,
  p_leaderboard_visible boolean DEFAULT NULL,
  p_share_stats_with_friends boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new_username text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If username is being changed, check case-insensitive uniqueness
  IF p_username IS NOT NULL THEN
    v_new_username := trim(p_username);
    IF v_new_username = '' THEN
      RAISE EXCEPTION 'Username cannot be empty';
    END IF;

    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE lower(username) = lower(v_new_username)
        AND id != v_uid
    ) THEN
      RAISE EXCEPTION 'Username already taken';
    END IF;
  END IF;

  -- Update only safe columns
  UPDATE profiles SET
    username = COALESCE(v_new_username, username),
    display_name = COALESCE(p_display_name, display_name),
    bio = COALESCE(p_bio, bio),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
    public_profile = COALESCE(p_public_profile, public_profile),
    leaderboard_visible = COALESCE(p_leaderboard_visible, leaderboard_visible),
    share_stats_with_friends = COALESCE(p_share_stats_with_friends, share_stats_with_friends)
  WHERE id = v_uid;
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION update_own_profile TO authenticated;

-- ─── Auto-create profile on signup ───
-- Drop old trigger/trigger function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
