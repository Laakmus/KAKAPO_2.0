-- Add INSERT policy for chats table
-- Allows users to create chats where they are one of the participants
CREATE POLICY chats_insert_participant
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

COMMENT ON POLICY chats_insert_participant ON chats IS 'Users can create chats where they are one of the participants';
