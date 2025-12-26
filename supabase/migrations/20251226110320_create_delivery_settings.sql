/*
  # Create Delivery Settings and Address Data Tables

  1. New Tables
    - `delivery_settings` - Admin-controlled delivery pricing and ETA settings
      - `id` (uuid, primary key)
      - `region_code` (text, unique identifier for region)
      - `region_name_uz` (text, region name in Uzbek)
      - `region_name_ru` (text, region name in Russian)
      - `region_name_en` (text, region name in English)
      - `base_delivery_price` (integer, base delivery price in UZS)
      - `is_free_delivery` (boolean, whether delivery is free)
      - `delivery_eta_hours` (integer, estimated delivery time in hours)
      - `is_active` (boolean, whether region is available for delivery)
      - `created_at`, `updated_at` (timestamps)

    - `city_delivery_overrides` - City-specific delivery price overrides
      - `id` (uuid, primary key)
      - `region_id` (uuid, foreign key to delivery_settings)
      - `city_name` (text, city/district name)
      - `delivery_price` (integer, override price, null means use region default)
      - `is_free_delivery` (boolean, override free delivery status)
      - `delivery_eta_hours` (integer, override ETA)

  2. Security
    - Enable RLS on all tables
    - Public read access (needed for checkout)
    - Admin-only write access

  3. Seed Data
    - All 14 regions of Uzbekistan with default delivery prices
*/

CREATE TABLE IF NOT EXISTS delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code text UNIQUE NOT NULL,
  region_name_uz text NOT NULL,
  region_name_ru text NOT NULL,
  region_name_en text NOT NULL,
  base_delivery_price integer NOT NULL DEFAULT 100000,
  is_free_delivery boolean NOT NULL DEFAULT false,
  delivery_eta_hours integer NOT NULL DEFAULT 72,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS city_delivery_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES delivery_settings(id) ON DELETE CASCADE,
  city_name text NOT NULL,
  city_name_ru text,
  city_name_en text,
  delivery_price integer,
  is_free_delivery boolean NOT NULL DEFAULT false,
  delivery_eta_hours integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(region_id, city_name)
);

ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_delivery_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to delivery_settings"
  ON delivery_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to city_delivery_overrides"
  ON city_delivery_overrides FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO delivery_settings (region_code, region_name_uz, region_name_ru, region_name_en, base_delivery_price, is_free_delivery, delivery_eta_hours, sort_order) VALUES
  ('bukhara', 'Buxoro viloyati', 'Бухарская область', 'Bukhara Region', 50000, false, 48, 1),
  ('tashkent_region', 'Toshkent viloyati', 'Ташкентская область', 'Tashkent Region', 100000, false, 72, 2),
  ('tashkent_city', 'Toshkent shahri', 'Город Ташкент', 'Tashkent City', 100000, false, 72, 3),
  ('samarkand', 'Samarqand viloyati', 'Самаркандская область', 'Samarkand Region', 100000, false, 72, 4),
  ('fergana', 'Fargona viloyati', 'Ферганская область', 'Fergana Region', 100000, false, 72, 5),
  ('andijan', 'Andijon viloyati', 'Андижанская область', 'Andijan Region', 100000, false, 72, 6),
  ('namangan', 'Namangan viloyati', 'Наманганская область', 'Namangan Region', 100000, false, 72, 7),
  ('kashkadarya', 'Qashqadaryo viloyati', 'Кашкадарьинская область', 'Kashkadarya Region', 100000, false, 72, 8),
  ('surkhandarya', 'Surxondaryo viloyati', 'Сурхандарьинская область', 'Surkhandarya Region', 100000, false, 72, 9),
  ('navoi', 'Navoiy viloyati', 'Навоийская область', 'Navoi Region', 100000, false, 72, 10),
  ('khorezm', 'Xorazm viloyati', 'Хорезмская область', 'Khorezm Region', 100000, false, 72, 11),
  ('jizzakh', 'Jizzax viloyati', 'Джизакская область', 'Jizzakh Region', 100000, false, 72, 12),
  ('syrdarya', 'Sirdaryo viloyati', 'Сырдарьинская область', 'Syrdarya Region', 100000, false, 72, 13),
  ('karakalpakstan', 'Qoraqalpogiston Respublikasi', 'Республика Каракалпакстан', 'Republic of Karakalpakstan', 100000, false, 72, 14)
ON CONFLICT (region_code) DO NOTHING;

DO $$
DECLARE
  bukhara_id uuid;
BEGIN
  SELECT id INTO bukhara_id FROM delivery_settings WHERE region_code = 'bukhara';
  
  IF bukhara_id IS NOT NULL THEN
    INSERT INTO city_delivery_overrides (region_id, city_name, city_name_ru, city_name_en, delivery_price, is_free_delivery, delivery_eta_hours)
    VALUES (bukhara_id, 'Buxoro shahri', 'Город Бухара', 'Bukhara City', 0, true, 24)
    ON CONFLICT (region_id, city_name) DO NOTHING;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_delivery_settings_region_code ON delivery_settings(region_code);
CREATE INDEX IF NOT EXISTS idx_delivery_settings_active ON delivery_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_city_overrides_region ON city_delivery_overrides(region_id);
CREATE INDEX IF NOT EXISTS idx_city_overrides_city ON city_delivery_overrides(city_name);