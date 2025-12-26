/*
  # Critical Fix: Enable Realtime for Chat System

  This migration fixes the broken live chat by:
  
  1. Adding chat_messages and chat_sessions to Supabase Realtime publication
  2. Setting REPLICA IDENTITY FULL for proper realtime change detection
  3. Ensuring triggers exist for updating session metadata

  Without these changes, the frontend cannot receive real-time message updates.
*/

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Enable realtime for chat_sessions  
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;

-- Set replica identity to FULL for proper realtime filtering
-- This allows Supabase to send the full row data on changes
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_sessions REPLICA IDENTITY FULL;

-- Ensure the trigger for updating session last_message_at exists and works
DROP TRIGGER IF EXISTS update_session_on_message ON chat_messages;

CREATE TRIGGER update_session_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_message();
