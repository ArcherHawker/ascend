-- Add lastQuestDate and seenQuestIds columns to user_game_state
ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS last_quest_date text;
ALTER TABLE user_game_state ADD COLUMN IF NOT EXISTS seen_quest_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
