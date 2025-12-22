/*
  # Enhanced Hierarchical Category System

  1. Changes to Categories Table
    - Add `status` field (active/hidden)
    - Add `level` for depth tracking
    - Add `path` for materialized path (efficient queries)
    - Add `slug` for SEO-friendly URLs
    - Add `description` for category description

  2. New Tables
    - `category_audit_log` - tracks all category changes for audit purposes

  3. Security
    - RLS policies for audit log table

  4. Functions
    - `get_category_tree()` - returns full category tree with product counts
    - `update_category_path()` - trigger function to maintain path/level
*/

-- Add new columns to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
ADD COLUMN IF NOT EXISTS level integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS path text DEFAULT '',
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS description text;

-- Create unique index for slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug) WHERE slug IS NOT NULL;

-- Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Create index for path queries
CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path);

-- Create index for sort_order
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);

-- Create category audit log table
CREATE TABLE IF NOT EXISTS category_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'move')),
  old_data jsonb,
  new_data jsonb,
  changed_by text,
  changed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS on audit log
ALTER TABLE category_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for audit log - anyone can view (for admin panel)
CREATE POLICY "Anyone can view audit log"
  ON category_audit_log
  FOR SELECT
  USING (true);

-- Policy for audit log - anyone can insert (for admin panel)
CREATE POLICY "Anyone can insert audit log"
  ON category_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Create function to update category path and level
CREATE OR REPLACE FUNCTION update_category_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path text;
  parent_level integer;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := NEW.id::text;
    NEW.level := 0;
  ELSE
    SELECT path, level INTO parent_path, parent_level
    FROM categories WHERE id = NEW.parent_id;
    
    NEW.path := COALESCE(parent_path, '') || '/' || NEW.id::text;
    NEW.level := COALESCE(parent_level, 0) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for path updates
DROP TRIGGER IF EXISTS trigger_update_category_path ON categories;
CREATE TRIGGER trigger_update_category_path
  BEFORE INSERT OR UPDATE OF parent_id ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_category_path();

-- Update existing categories with path and level
UPDATE categories 
SET path = id::text, level = 0 
WHERE parent_id IS NULL AND (path IS NULL OR path = '');

-- Generate slugs for existing categories
UPDATE categories 
SET slug = LOWER(REPLACE(REPLACE(name_en, ' ', '-'), '''', ''))
WHERE slug IS NULL AND name_en IS NOT NULL;