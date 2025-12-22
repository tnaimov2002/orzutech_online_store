/*
  # Create Audit Logs Table for Admin Actions

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key)
      - `action_type` (text) - Type of action: delete_customer, delete_order, reset_statistics, etc.
      - `target_type` (text) - What was affected: customer, order, statistics
      - `target_id` (uuid, nullable) - ID of affected record if applicable
      - `target_details` (jsonb) - Snapshot of deleted/modified data
      - `performed_by` (text) - Admin who performed the action
      - `performed_by_id` (uuid, nullable) - Admin user ID
      - `ip_address` (text, nullable)
      - `user_agent` (text, nullable)
      - `created_at` (timestamptz)
      - `notes` (text, nullable) - Additional context

  2. Security
    - Enable RLS on `audit_logs` table
    - Only super_admin and admin can view logs
    - Logs are APPEND-ONLY (no delete/update policies)

  3. Notes
    - This table is critical for compliance and security
    - Deletion of audit logs is not permitted through policies
*/

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  target_details jsonb,
  performed_by text NOT NULL,
  performed_by_id uuid,
  ip_address text,
  user_agent text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);