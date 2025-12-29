export type Language = 'uz' | 'ru' | 'en';

export interface Category {
  id: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  parent_id: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  status: 'active' | 'hidden';
  level: number;
  path: string;
  slug: string | null;
  description: string | null;
  show_in_header: boolean;
  created_at: string;
  updated_at: string;
  children?: Category[];
  product_count?: number;
  children_count?: number;
}

export interface CategoryAuditLog {
  id: string;
  category_id: string | null;
  action: 'create' | 'update' | 'delete' | 'move';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_type: string;
  variant_value: string;
  price_modifier: number;
  stock_quantity: number;
}

export interface Product {
  id: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  price: number;
  original_price: number | null;
  category_id: string | null;
  brand: string | null;
  stock_quantity: number;
  weight_kg: number;
  warranty_uz: string;
  warranty_ru: string;
  warranty_en: string;
  is_new: boolean;
  is_popular: boolean;
  is_discount: boolean;
  sku: string | null;
  rating: number;
  review_count: number;
  created_at: string;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
  category?: Category;
}

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface Banner {
  id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  subtitle_uz: string;
  subtitle_ru: string;
  subtitle_en: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface StoreLocation {
  id: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  address_uz: string;
  address_ru: string;
  address_en: string;
  working_hours: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  is_active: boolean;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  total_spent: number;
  order_count: number;
  is_vip: boolean;
  is_blacklisted: boolean;
  last_activity: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: 'new' | 'confirmed' | 'packed' | 'delivered' | 'cancelled' | 'returned';
  delivery_type: 'delivery' | 'pickup';
  delivery_address: string | null;
  store_location_id: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  gift_wrapping: boolean;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  order_items?: OrderItem[];
  store_location?: StoreLocation;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  variant_info: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariants: Record<string, string>;
  addedAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'manager';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}
