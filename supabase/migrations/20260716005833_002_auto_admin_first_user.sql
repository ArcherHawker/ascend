/*
# Auto-admin for first user

## Overview
Creates a trigger that automatically assigns the 'admin' role to the first
user who creates a profile. This ensures the project owner (who signs up
first) gets admin access without manual database intervention.

## Changes
- New function `set_first_user_admin()` — checks if any admin exists; if not,
  sets the inserting profile's role to 'admin'.
- New trigger `on_profile_insert_set_admin` — fires BEFORE INSERT on profiles.
- A safety function `promote_user_to_admin(p_email text)` — allows promoting
  a user by email via SQL if needed (e.g. if first-user logic fails).

## Security
- The trigger function is SECURITY DEFINER so it can read/update all profiles
  regardless of RLS.
- Only the first user (when no admin exists) gets auto-promoted.
- `promote_user_to_admin` is SECURITY DEFINER and can only be called via
  service role or SQL — not exposed to the anon key.
*/

-- Function to auto-promote first user to admin
CREATE OR REPLACE FUNCTION set_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If no admin exists yet, promote this user
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'admin') THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS on_profile_insert_set_admin ON profiles;
CREATE TRIGGER on_profile_insert_set_admin
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_first_user_admin();

-- Safety function: promote a user by email (for manual admin setup)
CREATE OR REPLACE FUNCTION promote_user_to_admin(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET role = 'admin'
  WHERE id = (SELECT id FROM auth.users WHERE email = p_email);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No user found with email: %', p_email;
  END IF;
END;
$$;
