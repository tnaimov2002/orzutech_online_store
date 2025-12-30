/*
  # Add MoySklad Sync Columns

  1. Changes to Categories Table
    - Add `moysklad_id` (text, unique) - MoySklad category folder ID
    - Add `moysklad_parent_id` (text) - MoySklad parent folder ID for hierarchy mapping

  2. Changes to Products Table  
    - Add `moysklad_id` (text, unique) - MoySklad product ID
    - Add `stock` (integer, default 0) - Current stock quantity from MoySklad

  3. Indexes
    - Index on categories.moysklad_id for fast lookups during sync
    - Index on products.moysklad_id for fast lookups during sync
    - Index on products.stock for filtering available products

  4. Functions
    - update_products_stock: Bulk update stock from MoySklad data
*/

-- Add MoySklad columns to categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'moysklad_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN moysklad_id text UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'moysklad_parent_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN moysklad_parent_id text;
  END IF;
END $$;

-- Add MoySklad columns to products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'moysklad_id'
  ) THEN
    ALTER TABLE products ADD COLUMN moysklad_id text UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stock'
  ) THEN
    ALTER TABLE products ADD COLUMN stock integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for fast sync lookups
CREATE INDEX IF NOT EXISTS idx_categories_moysklad_id ON categories(moysklad_id) WHERE moysklad_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_moysklad_id ON products(moysklad_id) WHERE moysklad_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock) WHERE stock > 0;

-- Create function to bulk update product stock
CREATE OR REPLACE FUNCTION update_products_stock(payload jsonb)
RETURNS void AS $$
BEGIN
  UPDATE products p
  SET 
    stock = (item->>'stock')::integer,
    updated_at = now()
  FROM jsonb_array_elements(payload) AS item
  WHERE p.moysklad_id = item->>'moysklad_id';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to resolve MoySklad parent_id to actual parent_id
CREATE OR REPLACE FUNCTION resolve_category_parents()
RETURNS void AS $$
BEGIN
  UPDATE categories c
  SET parent_id = parent_cat.id
  FROM categories parent_cat
  WHERE c.moysklad_parent_id IS NOT NULL
    AND c.moysklad_parent_id = parent_cat.moysklad_id
    AND (c.parent_id IS NULL OR c.parent_id != parent_cat.id);
    
  -- Calculate level based on parent hierarchy
  UPDATE categories
  SET level = 0
  WHERE parent_id IS NULL;
  
  UPDATE categories c
  SET level = 1
  FROM categories parent
  WHERE c.parent_id = parent.id
    AND parent.level = 0;
    
  UPDATE categories c
  SET level = 2
  FROM categories parent
  WHERE c.parent_id = parent.id
    AND parent.level = 1;
    
  UPDATE categories c
  SET level = 3
  FROM categories parent
  WHERE c.parent_id = parent.id
    AND parent.level = 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;