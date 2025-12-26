/*
  # Add Product Weight Field

  1. Changes
    - Add `weight_kg` column to products table for delivery price calculation
    - Default weight is 0.5 kg for products without specified weight

  2. Purpose
    - Enable weight-based delivery price calculation
    - BTS postal pricing depends on package weight:
      - Up to 1 kg: 35,000 UZS
      - Each additional kg: +5,000 UZS
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'weight_kg'
  ) THEN
    ALTER TABLE products ADD COLUMN weight_kg decimal(10,2) DEFAULT 0.5;
  END IF;
END $$;

COMMENT ON COLUMN products.weight_kg IS 'Product weight in kilograms for delivery calculation';