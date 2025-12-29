/*
  # Update Delivery Pricing for BTS Integration

  1. Changes
    - Update base delivery prices to start from 35,000 UZS
    - Update Bukhara region pricing
    - Add BTS-related fields for tariff caching
    - Update city overrides for Bukhara city (free delivery)

  2. New Fields
    - `bts_tariff_cached` (integer) - Cached BTS tariff
    - `bts_cache_updated_at` (timestamp) - When BTS cache was last updated
    - `use_bts_tariff` (boolean) - Whether to use BTS tariff or admin override

  3. Pricing Updates
    - Bukhara City: FREE (0 UZS), 24h ETA
    - Bukhara Region: From 35,000 UZS, 48h ETA
    - Other Regions: From 35,000 UZS, 48-72h ETA
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_settings' AND column_name = 'bts_tariff_cached'
  ) THEN
    ALTER TABLE delivery_settings ADD COLUMN bts_tariff_cached integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_settings' AND column_name = 'bts_cache_updated_at'
  ) THEN
    ALTER TABLE delivery_settings ADD COLUMN bts_cache_updated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_settings' AND column_name = 'use_bts_tariff'
  ) THEN
    ALTER TABLE delivery_settings ADD COLUMN use_bts_tariff boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_delivery_overrides' AND column_name = 'bts_tariff_cached'
  ) THEN
    ALTER TABLE city_delivery_overrides ADD COLUMN bts_tariff_cached integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_delivery_overrides' AND column_name = 'bts_cache_updated_at'
  ) THEN
    ALTER TABLE city_delivery_overrides ADD COLUMN bts_cache_updated_at timestamptz;
  END IF;
END $$;

UPDATE delivery_settings
SET base_delivery_price = 35000, delivery_eta_hours = 48
WHERE region_code = 'bukhara';

UPDATE delivery_settings
SET base_delivery_price = 35000, delivery_eta_hours = 72
WHERE region_code != 'bukhara';

UPDATE city_delivery_overrides
SET delivery_price = 0, is_free_delivery = true, delivery_eta_hours = 24
WHERE city_name ILIKE '%Buxoro shahar%' OR city_name ILIKE '%Buxoro shah%';