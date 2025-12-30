/*
  # Add Bulk Sync Progress Columns

  1. Changes
    - Add `total` column to track total items to process
    - Add `processed` column to track items processed so far
    - Add `started_at` column to track when sync started
    - Add `finished_at` column to track when sync completed
    - Update status check constraint to include 'running' and 'idle'

  2. Notes
    - These columns support real-time progress tracking for bulk sync operations
    - External Node.js scripts write to this table
    - Admin panel reads from this table via Supabase Realtime
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_status' AND column_name = 'total'
  ) THEN
    ALTER TABLE sync_status ADD COLUMN total integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_status' AND column_name = 'processed'
  ) THEN
    ALTER TABLE sync_status ADD COLUMN processed integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_status' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE sync_status ADD COLUMN started_at timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_status' AND column_name = 'finished_at'
  ) THEN
    ALTER TABLE sync_status ADD COLUMN finished_at timestamp with time zone;
  END IF;
END $$;

ALTER TABLE sync_status DROP CONSTRAINT IF EXISTS sync_status_status_check;

ALTER TABLE sync_status ADD CONSTRAINT sync_status_status_check 
  CHECK (status IN ('success', 'error', 'in_progress', 'pending', 'running', 'idle'));

UPDATE sync_status SET total = 0, processed = 0 WHERE total IS NULL;

ALTER TABLE sync_status REPLICA IDENTITY FULL;