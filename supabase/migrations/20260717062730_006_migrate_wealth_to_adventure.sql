-- Update default stats to replace 'wealth' with 'adventure'
-- This doesn't change existing rows — the app handles missing keys with defaults
-- Just ensures new rows get the correct default
ALTER TABLE user_game_state ALTER COLUMN stats SET DEFAULT '{"strength":40,"intelligence":45,"health":50,"discipline":40,"social":45,"creativity":40,"adventure":35,"athleticism":40}'::jsonb;

-- For existing rows that have 'wealth' but not 'adventure', migrate the value
UPDATE user_game_state
SET stats = stats - 'wealth' || jsonb_build_object('adventure', COALESCE(stats->>'wealth', '35')::int)
WHERE stats ? 'wealth' AND NOT (stats ? 'adventure');
