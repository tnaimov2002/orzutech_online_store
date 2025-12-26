import { supabase } from '../lib/supabase';

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
}

export interface Street {
  name: string;
  displayName: string;
}

export interface DeliveryInfo {
  price: number;
  isFree: boolean;
  etaHours: number;
  etaText: string;
}

export interface CityOverride {
  cityName: string;
  deliveryPrice: number | null;
  isFreeDelivery: boolean;
  deliveryEtaHours: number | null;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const PHOTON_BASE_URL = 'https://photon.komoot.io';

const REGION_OSM_MAPPING: Record<string, string> = {
  bukhara: 'Bukhara Region',
  tashkent_region: 'Tashkent Region',
  tashkent_city: 'Tashkent',
  samarkand: 'Samarkand Region',
  fergana: 'Fergana Region',
  andijan: 'Andijan Region',
  namangan: 'Namangan Region',
  kashkadarya: 'Qashqadaryo Region',
  surkhandarya: 'Surxondaryo Region',
  navoi: 'Navoiy Region',
  khorezm: 'Xorazm Region',
  jizzakh: 'Jizzakh Region',
  syrdarya: 'Sirdaryo Region',
  karakalpakstan: 'Karakalpakstan',
};

const BUKHARA_DISTRICTS = [
  { name: 'Buxoro shahri', displayName: 'Buxoro shahri (shahar)' },
  { name: 'Olot tumani', displayName: 'Olot tumani' },
  { name: 'Buxoro tumani', displayName: 'Buxoro tumani' },
  { name: 'Vobkent tumani', displayName: 'Vobkent tumani' },
  { name: "G'ijduvon tumani", displayName: "G'ijduvon tumani" },
  { name: 'Jondor tumani', displayName: 'Jondor tumani' },
  { name: 'Kogon tumani', displayName: 'Kogon tumani' },
  { name: 'Kogon shahri', displayName: 'Kogon shahri' },
  { name: 'Qorako\'l tumani', displayName: "Qorako'l tumani" },
  { name: 'Qorovulbozor tumani', displayName: 'Qorovulbozor tumani' },
  { name: 'Peshku tumani', displayName: 'Peshku tumani' },
  { name: 'Romitan tumani', displayName: 'Romitan tumani' },
  { name: 'Shofirkon tumani', displayName: 'Shofirkon tumani' },
];

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

export async function fetchDistricts(regionCode: string): Promise<District[]> {
  if (regionCode === 'bukhara') {
    return BUKHARA_DISTRICTS;
  }

  const osmRegionName = REGION_OSM_MAPPING[regionCode];
  if (!osmRegionName) {
    return [];
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?` +
        new URLSearchParams({
          country: 'Uzbekistan',
          state: osmRegionName,
          format: 'json',
          addressdetails: '1',
          limit: '50',
          featuretype: 'city',
        }),
      {
        headers: {
          'User-Agent': 'YulduzElectronics/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Nominatim API error');
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const districts = data
        .filter((item: { type: string }) =>
          item.type === 'city' || item.type === 'town' || item.type === 'administrative'
        )
        .map((item: { display_name: string; name: string }) => ({
          name: item.name || item.display_name.split(',')[0],
          displayName: item.name || item.display_name.split(',')[0],
        }));

      if (districts.length > 0) {
        return districts;
      }
    }

    return fetchDistrictsFromPhoton(osmRegionName);
  } catch (error) {
    console.error('Error fetching districts from Nominatim:', error);
    return fetchDistrictsFromPhoton(osmRegionName);
  }
}

async function fetchDistrictsFromPhoton(regionName: string): Promise<District[]> {
  try {
    const response = await fetch(
      `${PHOTON_BASE_URL}/api/?` +
        new URLSearchParams({
          q: `${regionName}, Uzbekistan`,
          limit: '30',
          lang: 'en',
        })
    );

    if (!response.ok) {
      throw new Error('Photon API error');
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const districts = data.features
        .filter((f: { properties: { type: string } }) =>
          f.properties.type === 'city' ||
          f.properties.type === 'town' ||
          f.properties.type === 'district'
        )
        .map((f: { properties: { name: string } }) => ({
          name: f.properties.name,
          displayName: f.properties.name,
        }));

      if (districts.length > 0) {
        return districts;
      }
    }

    return [];
  } catch (error) {
    console.error('Error fetching districts from Photon:', error);
    return [];
  }
}

export async function fetchStreets(
  regionCode: string,
  cityName: string
): Promise<Street[]> {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?` +
        new URLSearchParams({
          city: cityName,
          country: 'Uzbekistan',
          format: 'json',
          addressdetails: '1',
          limit: '50',
          featuretype: 'street',
        }),
      {
        headers: {
          'User-Agent': 'YulduzElectronics/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Nominatim API error');
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const streets = data
        .filter((item: { type: string; class: string }) =>
          item.type === 'street' ||
          item.type === 'road' ||
          item.class === 'highway'
        )
        .map((item: { display_name: string; name: string }) => ({
          name: item.name || item.display_name.split(',')[0],
          displayName: item.name || item.display_name.split(',')[0],
        }));

      return streets;
    }

    return fetchStreetsFromPhoton(cityName);
  } catch (error) {
    console.error('Error fetching streets:', error);
    return fetchStreetsFromPhoton(cityName);
  }
}

async function fetchStreetsFromPhoton(cityName: string): Promise<Street[]> {
  try {
    const response = await fetch(
      `${PHOTON_BASE_URL}/api/?` +
        new URLSearchParams({
          q: `street ${cityName} Uzbekistan`,
          limit: '30',
          lang: 'en',
        })
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const streets = data.features
        .filter((f: { properties: { type: string; osm_key: string } }) =>
          f.properties.type === 'street' ||
          f.properties.osm_key === 'highway'
        )
        .map((f: { properties: { name: string; street: string } }) => ({
          name: f.properties.name || f.properties.street,
          displayName: f.properties.name || f.properties.street,
        }));

      return streets;
    }

    return [];
  } catch {
    return [];
  }
}

export function calculateDeliveryInfo(
  region: Region | null,
  cityName: string,
  cityOverrides: CityOverride[],
  language: 'uz' | 'ru' | 'en'
): DeliveryInfo {
  const defaultInfo: DeliveryInfo = {
    price: 100000,
    isFree: false,
    etaHours: 72,
    etaText: language === 'uz' ? '48-72 soat' : language === 'ru' ? '48-72 часа' : '48-72 hours',
  };

  if (!region) {
    return defaultInfo;
  }

  const cityOverride = cityOverrides.find(
    (c) => c.cityName.toLowerCase() === cityName.toLowerCase()
  );

  if (cityOverride) {
    const isFree = cityOverride.isFreeDelivery;
    const price = isFree ? 0 : (cityOverride.deliveryPrice ?? region.baseDeliveryPrice);
    const etaHours = cityOverride.deliveryEtaHours ?? region.deliveryEtaHours;

    return {
      price,
      isFree,
      etaHours,
      etaText: formatEtaText(etaHours, language),
    };
  }

  return {
    price: region.isFreeDelivery ? 0 : region.baseDeliveryPrice,
    isFree: region.isFreeDelivery,
    etaHours: region.deliveryEtaHours,
    etaText: formatEtaText(region.deliveryEtaHours, language),
  };
}

function formatEtaText(hours: number, language: 'uz' | 'ru' | 'en'): string {
  if (hours <= 24) {
    return language === 'uz'
      ? '24 soat ichida'
      : language === 'ru'
        ? 'В течение 24 часов'
        : 'Within 24 hours';
  }
  if (hours <= 48) {
    return language === 'uz'
      ? '48 soat ichida'
      : language === 'ru'
        ? 'В течение 48 часов'
        : 'Within 48 hours';
  }
  return language === 'uz'
    ? '48-72 soat'
    : language === 'ru'
      ? '48-72 часа'
      : '48-72 hours';
}
