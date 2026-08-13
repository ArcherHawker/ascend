/*
# Direct Messages (Friend Chat)

## Overview
Adds a direct messaging system so friends can send motivational messages
to each other. Messages are between two accepted friends only.

## New Tables

### direct_messages
- id (uuid PK)
- sender_id (uuid, references auth.users) — who sent the message
- recipient_id (uuid, references auth.users) — who receives it
- content (text, max 1000 chars) — the message text
- created_at (timestamptz) — when sent
- read_at (timestamptz, nullable) — when the recipient read it

## Security (RLS)

### direct_messages
- SELECT: users can read messages where they are sender OR recipient
- INSERT: users can insert only where they are the sender
- UPDATE: only the recipient can mark a message as read (set read_at)
- DELETE: blocked (messages are permanent)

## Important Notes
1. The frontend enforces that messages are only sent to accepted friends.
2. Messages are limited to 1000 characters to prevent abuse.
3. Realtime is enabled on the table for live message delivery.
*/

CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_involved" ON direct_messages;
CREATE POLICY "messages_select_involved"
ON direct_messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "messages_insert_sender" ON direct_messages;
CREATE POLICY "messages_insert_sender"
ON direct_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_update_recipient" ON direct_messages;
CREATE POLICY "messages_update_recipient"
ON direct_messages FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON direct_messages(created_at DESC);

-- Enable realtime (idempotent: only add if not already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
  END IF;
END $$;
