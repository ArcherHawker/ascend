/*
# Restrict direct messages to accepted friends

## Overview
Tightens direct-message access so browser requests cannot bypass the friend relationship.

## Security Changes
- Reads require the signed-in user to be one side of an accepted friendship.
- New messages require the sender and recipient to be accepted friends.
- Read receipts require the recipient and sender to be accepted friends.
- The existing message table, content checks, indexes, and realtime publication remain unchanged.

## Important Notes
1. This migration is safe to re-run because policies are replaced in place.
2. Authorization is enforced in Supabase, not only in the interface.
*/

DROP POLICY IF EXISTS "messages_select_involved" ON direct_messages;
CREATE POLICY "messages_select_accepted_friends"
ON direct_messages FOR SELECT
TO authenticated
USING (
  (auth.uid() = sender_id OR auth.uid() = recipient_id)
  AND EXISTS (
    SELECT 1
    FROM friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = sender_id AND f.addressee_id = recipient_id)
        OR (f.requester_id = recipient_id AND f.addressee_id = sender_id))
      AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_insert_sender" ON direct_messages;
CREATE POLICY "messages_insert_accepted_friend"
ON direct_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = sender_id AND f.addressee_id = recipient_id)
        OR (f.requester_id = recipient_id AND f.addressee_id = sender_id))
      AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_update_recipient" ON direct_messages;
CREATE POLICY "messages_update_accepted_friend_recipient"
ON direct_messages FOR UPDATE
TO authenticated
USING (
  auth.uid() = recipient_id
  AND EXISTS (
    SELECT 1
    FROM friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = sender_id AND f.addressee_id = recipient_id)
        OR (f.requester_id = recipient_id AND f.addressee_id = sender_id))
      AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  )
)
WITH CHECK (auth.uid() = recipient_id);
