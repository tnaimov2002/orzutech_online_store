/*
  # Enable Realtime for sync_status Table

  1. Changes
    - Enable Supabase Realtime for sync_status table
    - This allows the admin panel to receive live updates on sync progress

  2. Notes
    - External bulk sync scripts update this table
    - Admin panel subscribes to changes via Supabase Realtime
*/

ALTER PUBLICATION supabase_realtime ADD TABLE sync_status;