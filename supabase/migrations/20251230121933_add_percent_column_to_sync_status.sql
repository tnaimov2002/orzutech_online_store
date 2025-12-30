/*
  # Add percent column to sync_status table

  1. Changes
    - Add `percent` column (INTEGER, default 0) to track sync progress percentage
    - This enables real-time progress bar display in Admin Panel

  2. Notes
    - percent should be 0-100
    - Updated by Edge Functions during sync
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_status' AND column_name = 'percent'
  ) THEN
    ALTER TABLE sync_status ADD COLUMN percent INTEGER DEFAULT 0;
  END IF;
END $$;