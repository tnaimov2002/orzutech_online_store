/*
  # Add Operator Handoff Support
  
  This migration adds fields to support the "Connect to Operator" feature:
  
  1. Changes to chat_sessions table:
    - handoff_requested: boolean flag when user requests human operator
    - handoff_requested_at: timestamp of when handoff was requested
    - ai_disabled: boolean to stop AI from responding after handoff
    
  2. These fields enable:
    - Users to request human assistance at any time
    - AI to stop responding after handoff
    - Admin panel to see handoff requests
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'handoff_requested'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN handoff_requested boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'handoff_requested_at'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN handoff_requested_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_sessions' AND column_name = 'ai_disabled'
  ) THEN
    ALTER TABLE chat_sessions ADD COLUMN ai_disabled boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_handoff ON chat_sessions(handoff_requested) WHERE handoff_requested = true;
