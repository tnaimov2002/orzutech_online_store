import { Product } from '../types';

const MOYSKLAD_SYNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moysklad-sync`;

interface ProductsResponse {
  ok: boolean;
  products: Product[];
  error?: string;
}

interface SingleProductResponse {
  ok: boolean;
  product: Product | null;
  error?: string;
}

interface FetchProductsOptions {
  categoryId?: string;
  isNew?: boolean;
  isPopular?: boolean;
  isDiscount?: boolean;
  limit?: number;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'newest' | 'priceAsc' | 'priceDesc' | 'popular';
}

export async function fetchProducts(options: FetchProductsOptions = {}): Promise<Product[]> {
  const params = new URLSearchParams({ read_only: 'true' });

  if (options.categoryId) params.set('category_id', options.categoryId);
  if (options.isNew) params.set('is_new', 'true');
  if (options.isPopular) params.set('is_popular', 'true');
  if (options.isDiscount) params.set('is_discount', 'true');
  if (options.limit && !options.brands?.length && !options.minPrice && !options.maxPrice) {
    params.set('limit', options.limit.toString());
  }

  const url = `${MOYSKLAD_SYNC_URL}?${params.toString()}`;

  const res = await fetch(url);

  if (!res.ok) {
    console.error('[PRODUCT SERVICE] Fetch failed:', res.status);
    return [];
  }

  const data: ProductsResponse = await res.json();

  if (!data.ok) {
    console.error('[PRODUCT SERVICE] API error:', data.error);
    return [];
  }

  let products = data.products || [];

  if (options.brands && options.brands.length > 0) {
    products = products.filter(p => p.brand && options.brands!.includes(p.brand));
  }

  if (options.minPrice !== undefined) {
    products = products.filter(p => p.price >= options.minPrice!);
  }

  if (options.maxPrice !== undefined) {
    products = products.filter(p => p.price <= options.maxPrice!);
  }

  if (options.sortBy) {
    switch (options.sortBy) {
      case 'newest':
        products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'priceAsc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'priceDesc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }
  }

  if (options.limit && (options.brands?.length || options.minPrice || options.maxPrice)) {
    products = products.slice(0, options.limit);
  }

  return products;
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  const params = new URLSearchParams({
    read_only: 'true',
    product_id: productId,
  });

  const url = `${MOYSKLAD_SYNC_URL}?${params.toString()}`;

  const res = await fetch(url);

  if (!res.ok) {
    console.error('[PRODUCT SERVICE] Fetch product failed:', res.status);
    return null;
  }

  const data: SingleProductResponse = await res.json();

  if (!data.ok) {
    console.error('[PRODUCT SERVICE] API error:', data.error);
    return null;
  }

  return data.product;
}

export async function fetchAllProducts(): Promise<Product[]> {
  return fetchProducts();
}

export async function fetchNewProducts(limit = 8): Promise<Product[]> {
  return fetchProducts({ isNew: true, limit });
}

export async function fetchPopularProducts(limit = 8): Promise<Product[]> {
  return fetchProducts({ isPopular: true, limit });
}

export async function fetchDiscountProducts(limit = 8): Promise<Product[]> {
  return fetchProducts({ isDiscount: true, limit });
}

export async function fetchProductsByCategory(categoryId: string): Promise<Product[]> {
  return fetchProducts({ categoryId });
}

export async function fetchProductBrands(): Promise<string[]> {
  const products = await fetchProducts();
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))] as string[];
  return brands.sort();
}

export async function triggerSync(): Promise<{ ok: boolean; synced?: number; error?: string }> {
  const res = await fetch(MOYSKLAD_SYNC_URL);

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }

  return res.json();
}
