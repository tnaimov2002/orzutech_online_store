/*
  # Add Icon Field to Categories Table
  
  1. Changes
    - Add `icon` column to `categories` table
    - This column stores the icon name from lucide-react library
    - Icons will be displayed in navigation menus alongside category names
  
  2. Purpose
    - Improve visual hierarchy in navigation
    - Better readability and faster navigation
    - Professional e-commerce UX (Amazon/Alibaba style)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'icon'
  ) THEN
    ALTER TABLE categories ADD COLUMN icon text DEFAULT NULL;
  END IF;
END $$;

COMMENT ON COLUMN categories.icon IS 'Lucide icon name for category display in navigation';