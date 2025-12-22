/*
  # Add Missing Featured Categories

  1. New Categories
    - `Planshetlar` (Tablets) - under Mobile parent category
    - `O'yinlar` (Games/Gaming) - under Computer equipment parent category

  2. Purpose
    - These categories are required for the featured categories section on the homepage
    - Both are active and will display in the homepage category grid

  3. Notes
    - Categories are set with appropriate parent relationships
    - Using existing parent category IDs from the database
*/

INSERT INTO categories (
  id,
  name_uz,
  name_ru,
  name_en,
  slug,
  icon,
  parent_id,
  status,
  sort_order,
  level,
  path
)
VALUES
  (
    gen_random_uuid(),
    'Planshetlar',
    'Планшеты',
    'Tablets',
    'tablets',
    'tablet',
    '11111111-1111-1111-1111-111111111111',
    'active',
    10,
    1,
    'mobile.tablets'
  ),
  (
    gen_random_uuid(),
    'O''yinlar',
    'Игры',
    'Gaming',
    'gaming',
    'gamepad-2',
    'ce1cb283-9d21-4a04-9842-1a634346dda1',
    'active',
    15,
    1,
    'computer-equipment.gaming'
  )
ON CONFLICT DO NOTHING;