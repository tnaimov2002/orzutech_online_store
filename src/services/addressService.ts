import { supabase } from '../lib/supabase';
import { UZBEKISTAN_DISTRICTS, DistrictData } from '../data/uzbekistanDistricts';

export interface Region {
  id: string;
  code: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  baseDeliveryPrice: number;
  isFreeDelivery: boolean;
  deliveryEtaHours: number;
}

export interface District {
  name: string;
  displayName: string;
  isCity?: boolean;
}

export interface CityOverride {
  cityName: string;
  deliveryPrice: number | null;
  isFreeDelivery: boolean;
  deliveryEtaHours: number | null;
}

const requestCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  const data = await fetcher();
  requestCache.set(key, { data, timestamp: Date.now() });
  return data;
}

export async function fetchRegions(): Promise<Region[]> {
  const cacheKey = 'regions';
  return cachedFetch(cacheKey, async () => {
    const { data, error } = await supabase
      .from('delivery_settings')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error || !data) {
      console.error('Error fetching regions:', error);
      return [];
    }

    return data.map((r) => ({
      id: r.id,
      code: r.region_code,
      name_uz: r.region_name_uz,
      name_ru: r.region_name_ru,
      name_en: r.region_name_en,
      baseDeliveryPrice: r.base_delivery_price,
      isFreeDelivery: r.is_free_delivery,
      deliveryEtaHours: r.delivery_eta_hours,
    }));
  });
}

export async function fetchCityOverrides(regionId: string): Promise<CityOverride[]> {
  const cacheKey = `city_overrides_${regionId}`;
  return cachedFetch(cacheKey, async () => {
    const { data, error } = await supabase
      .from('city_delivery_overrides')
      .select('*')
      .eq('region_id', regionId)
      .eq('is_active', true);

    if (error || !data) {
      return [];
    }

    return data.map((c) => ({
      cityName: c.city_name,
      deliveryPrice: c.delivery_price,
      isFreeDelivery: c.is_free_delivery,
      deliveryEtaHours: c.delivery_eta_hours,
    }));
  });
}

export function fetchDistricts(regionCode: string): District[] {
  const districts = UZBEKISTAN_DISTRICTS[regionCode];

  if (!districts || districts.length === 0) {
    console.warn(`No districts found for region: ${regionCode}`);
    return [];
  }

  return districts.map((d: DistrictData) => ({
    name: d.name,
    displayName: d.displayName,
    isCity: d.isCity,
  }));
}

export function isBukharaCity(regionCode: string, districtName: string): boolean {
  if (regionCode !== 'bukhara') return false;
  const normalizedName = districtName.toLowerCase().trim();
  return normalizedName.includes('buxoro shahri') ||
         normalizedName === 'buxoro shahri' ||
         normalizedName === 'bukhara city';
}
