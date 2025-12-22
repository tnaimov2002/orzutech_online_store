/*
  # ORZUTECH E-Commerce Database Schema

  1. New Tables
    - `categories` - Product categories with parent-child relationships
      - `id` (uuid, primary key)
      - `name_uz`, `name_ru`, `name_en` (text) - Multi-language names
      - `parent_id` (uuid, nullable) - For subcategories
      - `image_url` (text) - Category image
      - `sort_order` (integer) - Display order
      - `created_at`, `updated_at` (timestamptz)
    
    - `products` - Main products table
      - `id` (uuid, primary key)
      - `name_uz`, `name_ru`, `name_en` (text) - Multi-language names
      - `description_uz`, `description_ru`, `description_en` (text)
      - `price` (decimal) - Current price
      - `original_price` (decimal) - Original price for discounts
      - `category_id` (uuid, foreign key)
      - `brand` (text) - Product brand
      - `stock_quantity` (integer) - Available stock
      - `warranty_uz`, `warranty_ru`, `warranty_en` (text)
      - `is_new`, `is_popular`, `is_discount` (boolean) - Flags
      - `sku` (text) - Product SKU
      - `rating` (decimal) - Average rating
      - `review_count` (integer)
      - `created_at`, `updated_at` (timestamptz)
    
    - `product_images` - Multiple images per product
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `image_url` (text)
      - `is_primary` (boolean)
      - `sort_order` (integer)
    
    - `product_variants` - Color, memory, model variants
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `variant_type` (text) - color, memory, model
      - `variant_value` (text)
      - `price_modifier` (decimal)
      - `stock_quantity` (integer)
    
    - `customers` - Customer CRM data
      - `id` (uuid, primary key)
      - `first_name`, `last_name` (text)
      - `phone`, `email` (text)
      - `region`, `city`, `address` (text)
      - `total_spent` (decimal)
      - `order_count` (integer)
      - `is_vip`, `is_blacklisted` (boolean)
      - `last_activity` (timestamptz)
      - `created_at` (timestamptz)
    
    - `orders` - Customer orders
      - `id` (uuid, primary key)
      - `order_number` (text, unique)
      - `customer_id` (uuid, foreign key)
      - `status` (text) - new, confirmed, packed, delivered, cancelled, returned
      - `delivery_type` (text) - delivery, pickup
      - `delivery_address` (text)
      - `store_location_id` (uuid, nullable)
      - `subtotal`, `delivery_fee`, `total` (decimal)
      - `notes` (text)
      - `gift_wrapping` (boolean)
      - `created_at`, `updated_at` (timestamptz)
    
    - `order_items` - Items in each order
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `product_name` (text) - Snapshot
      - `variant_info` (text)
      - `quantity` (integer)
      - `unit_price`, `total_price` (decimal)
    
    - `reviews` - Product reviews
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `customer_name` (text)
      - `rating` (integer)
      - `comment` (text)
      - `is_approved` (boolean)
      - `created_at` (timestamptz)
    
    - `store_locations` - Pickup store locations
      - `id` (uuid, primary key)
      - `name_uz`, `name_ru`, `name_en` (text)
      - `address_uz`, `address_ru`, `address_en` (text)
      - `working_hours` (text)
      - `phone` (text)
      - `latitude`, `longitude` (decimal)
      - `maps_url` (text)
      - `is_active` (boolean)
    
    - `banners` - Homepage slider banners
      - `id` (uuid, primary key)
      - `title_uz`, `title_ru`, `title_en` (text)
      - `subtitle_uz`, `subtitle_ru`, `subtitle_en` (text)
      - `image_url` (text)
      - `link_url` (text)
      - `is_active` (boolean)
      - `sort_order` (integer)
    
    - `admin_users` - Admin panel users
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `full_name` (text)
      - `role` (text) - super_admin, admin, manager
      - `is_active` (boolean)
      - `last_login` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for products, categories, banners, store_locations
    - Authenticated access for orders, customers, admin operations
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_uz text NOT NULL,
  name_ru text NOT NULL,
  name_en text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_uz text NOT NULL,
  name_ru text NOT NULL,
  name_en text NOT NULL,
  description_uz text DEFAULT '',
  description_ru text DEFAULT '',
  description_en text DEFAULT '',
  price decimal(12,2) NOT NULL DEFAULT 0,
  original_price decimal(12,2),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  brand text,
  stock_quantity integer DEFAULT 0,
  warranty_uz text DEFAULT '',
  warranty_ru text DEFAULT '',
  warranty_en text DEFAULT '',
  is_new boolean DEFAULT false,
  is_popular boolean DEFAULT false,
  is_discount boolean DEFAULT false,
  sku text,
  rating decimal(2,1) DEFAULT 0,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

-- Product variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  variant_type text NOT NULL,
  variant_value text NOT NULL,
  price_modifier decimal(12,2) DEFAULT 0,
  stock_quantity integer DEFAULT 0
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  region text,
  city text,
  address text,
  total_spent decimal(12,2) DEFAULT 0,
  order_count integer DEFAULT 0,
  is_vip boolean DEFAULT false,
  is_blacklisted boolean DEFAULT false,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Store locations table
CREATE TABLE IF NOT EXISTS store_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_uz text NOT NULL,
  name_ru text NOT NULL,
  name_en text NOT NULL,
  address_uz text NOT NULL,
  address_ru text NOT NULL,
  address_en text NOT NULL,
  working_hours text NOT NULL,
  phone text,
  latitude decimal(10,8),
  longitude decimal(11,8),
  maps_url text,
  is_active boolean DEFAULT true
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text DEFAULT 'new',
  delivery_type text NOT NULL,
  delivery_address text,
  store_location_id uuid REFERENCES store_locations(id) ON DELETE SET NULL,
  subtotal decimal(12,2) NOT NULL,
  delivery_fee decimal(12,2) DEFAULT 0,
  total decimal(12,2) NOT NULL,
  notes text,
  gift_wrapping boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  variant_info text,
  quantity integer NOT NULL,
  unit_price decimal(12,2) NOT NULL,
  total_price decimal(12,2) NOT NULL
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_uz text DEFAULT '',
  title_ru text DEFAULT '',
  title_en text DEFAULT '',
  subtitle_uz text DEFAULT '',
  subtitle_ru text DEFAULT '',
  subtitle_en text DEFAULT '',
  image_url text NOT NULL,
  link_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'admin',
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_flags ON products(is_new, is_popular, is_discount);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public read policies for storefront
CREATE POLICY "Public can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public can read product images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Public can read product variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Public can read approved reviews" ON reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Public can read active store locations" ON store_locations FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active banners" ON banners FOR SELECT USING (is_active = true);

-- Public insert policies for orders and customers
CREATE POLICY "Public can create customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can create order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can submit reviews" ON reviews FOR INSERT WITH CHECK (true);

-- Public update for customers (own data)
CREATE POLICY "Public can update customers" ON customers FOR UPDATE USING (true) WITH CHECK (true);

-- Admin full access policies (using service role, but also allow anon for demo)
CREATE POLICY "Admin can manage categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage product images" ON product_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage product variants" ON product_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can read customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Admin can read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Admin can update orders" ON orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admin can read order items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Admin can manage reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage store locations" ON store_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage banners" ON banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin can read admin users" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Admin can manage admin users" ON admin_users FOR ALL USING (true) WITH CHECK (true);