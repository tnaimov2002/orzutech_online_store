/*
  # Create Sync Status Table
  
  1. New Tables
    - `sync_status`
      - `id` (uuid, primary key)
      - `entity` (text) - 'products' or 'categories'
      - `last_sync_at` (timestamptz)
      - `status` (text) - 'success', 'error', 'in_progress'
      - `message` (text) - error message or success details
      - `records_synced` (integer) - number of records processed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `sync_status` table
    - Allow authenticated admin users to read sync status
    
  3. Notes
    - This table tracks MoySklad sync operations
    - Edge Functions update this table after each sync
*/

CREATE TABLE IF NOT EXISTS sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  last_sync_at timestamp with time zone,
  status text DEFAULT 'pending',
  message text,
  records_synced integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sync_status_entity_check CHECK (entity IN ('products', 'categories')),
  CONSTRAINT sync_status_status_check CHECK (status IN ('success', 'error', 'in_progress', 'pending'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_status_entity ON sync_status(entity);

ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to sync status"
  ON sync_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to manage sync status"
  ON sync_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO sync_status (entity, status, message)
VALUES 
  ('categories', 'pending', 'Awaiting first sync'),
  ('products', 'pending', 'Awaiting first sync')
ON CONFLICT (entity) DO NOTHING;

ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE categories REPLICA IDENTITY FULL;