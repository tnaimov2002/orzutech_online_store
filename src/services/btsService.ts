import { supabase } from '../lib/supabase';

export interface BtsTariff {
  price: number;
  etaHours: number;
  isFromCache: boolean;
  isFallback: boolean;
}

const BTS_FALLBACK_TARIFFS: Record<string, { price: number; etaHours: number }> = {
  bukhara_city: { price: 0, etaHours: 24 },
  bukhara_region: { price: 35000, etaHours: 48 },
  tashkent_city: { price: 45000, etaHours: 72 },
  tashkent_region: { price: 45000, etaHours: 72 },
  samarkand: { price: 40000, etaHours: 48 },
  fergana: { price: 50000, etaHours: 72 },
  andijan: { price: 50000, etaHours: 72 },
  namangan: { price: 50000, etaHours: 72 },
  kashkadarya: { price: 45000, etaHours: 72 },
  surkhandarya: { price: 55000, etaHours: 72 },
  navoi: { price: 40000, etaHours: 72 },
  khorezm: { price: 55000, etaHours: 72 },
  jizzakh: { price: 40000, etaHours: 72 },
  syrdarya: { price: 45000, etaHours: 72 },
  karakalpakstan: { price: 60000, etaHours: 72 },
  default: { price: 35000, etaHours: 72 },
};

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

const memoryCache = new Map<string, { tariff: BtsTariff; timestamp: number }>();

function getCacheKey(regionCode: string, cityName?: string): string {
  return cityName ? `${regionCode}:${cityName.toLowerCase()}` : regionCode;
}

function isBukharaCity(regionCode: string, cityName: string): boolean {
  const bukharaCityNames = [
    'buxoro shahri',
    'buxoro shahar',
    'bukhara city',
    'город бухара',
    'buxoro',
  ];

  if (regionCode !== 'bukhara') return false;

  const normalizedCity = cityName.toLowerCase().trim();
  return bukharaCityNames.some(name =>
    normalizedCity.includes(name) || normalizedCity === 'buxoro shahri'
  );
}

export async function getBtsTariff(
  regionCode: string,
  cityName: string,
  weightKg: number = 1
): Promise<BtsTariff> {
  if (isBukharaCity(regionCode, cityName)) {
    return {
      price: 0,
      etaHours: 24,
      isFromCache: false,
      isFallback: false,
    };
  }

  const cacheKey = getCacheKey(regionCode, cityName);

  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_DURATION_MS) {
    return { ...memoryCached.tariff, isFromCache: true };
  }

  try {
    const dbTariff = await getDbCachedTariff(regionCode, cityName);
    if (dbTariff) {
      memoryCache.set(cacheKey, { tariff: dbTariff, timestamp: Date.now() });
      return dbTariff;
    }
  } catch (error) {
    console.error('Error fetching DB cached tariff:', error);
  }

  try {
    const liveTariff = await fetchBtsLiveTariff(regionCode, cityName, weightKg);
    if (liveTariff) {
      await saveTariffToCache(regionCode, cityName, liveTariff);
      memoryCache.set(cacheKey, { tariff: liveTariff, timestamp: Date.now() });
      return liveTariff;
    }
  } catch (error) {
    console.error('BTS API unavailable, using fallback:', error);
  }

  return getFallbackTariff(regionCode, cityName);
}

async function getDbCachedTariff(
  regionCode: string,
  cityName: string
): Promise<BtsTariff | null> {
  const { data: regionData } = await supabase
    .from('delivery_settings')
    .select('*')
    .eq('region_code', regionCode)
    .maybeSingle();

  if (!regionData) return null;

  if (!regionData.use_bts_tariff && regionData.base_delivery_price !== null) {
    return {
      price: regionData.is_free_delivery ? 0 : regionData.base_delivery_price,
      etaHours: regionData.delivery_eta_hours,
      isFromCache: false,
      isFallback: false,
    };
  }

  const { data: cityOverride } = await supabase
    .from('city_delivery_overrides')
    .select('*')
    .eq('region_id', regionData.id)
    .ilike('city_name', `%${cityName}%`)
    .eq('is_active', true)
    .maybeSingle();

  if (cityOverride) {
    return {
      price: cityOverride.is_free_delivery ? 0 : (cityOverride.delivery_price ?? regionData.base_delivery_price),
      etaHours: cityOverride.delivery_eta_hours ?? regionData.delivery_eta_hours,
      isFromCache: cityOverride.bts_tariff_cached !== null,
      isFallback: false,
    };
  }

  if (regionData.bts_tariff_cached !== null && regionData.bts_cache_updated_at) {
    const cacheAge = Date.now() - new Date(regionData.bts_cache_updated_at).getTime();
    if (cacheAge < CACHE_DURATION_MS) {
      return {
        price: regionData.is_free_delivery ? 0 : regionData.bts_tariff_cached,
        etaHours: regionData.delivery_eta_hours,
        isFromCache: true,
        isFallback: false,
      };
    }
  }

  return {
    price: regionData.is_free_delivery ? 0 : regionData.base_delivery_price,
    etaHours: regionData.delivery_eta_hours,
    isFromCache: false,
    isFallback: false,
  };
}

async function fetchBtsLiveTariff(
  regionCode: string,
  cityName: string,
  weightKg: number
): Promise<BtsTariff | null> {
  return null;
}

async function saveTariffToCache(
  regionCode: string,
  cityName: string,
  tariff: BtsTariff
): Promise<void> {
  try {
    await supabase
      .from('delivery_settings')
      .update({
        bts_tariff_cached: tariff.price,
        bts_cache_updated_at: new Date().toISOString(),
      })
      .eq('region_code', regionCode);
  } catch (error) {
    console.error('Error saving tariff to cache:', error);
  }
}

function getFallbackTariff(regionCode: string, cityName: string): BtsTariff {
  if (isBukharaCity(regionCode, cityName)) {
    return {
      price: 0,
      etaHours: 24,
      isFromCache: false,
      isFallback: false,
    };
  }

  if (regionCode === 'bukhara') {
    return {
      price: BTS_FALLBACK_TARIFFS.bukhara_region.price,
      etaHours: BTS_FALLBACK_TARIFFS.bukhara_region.etaHours,
      isFromCache: false,
      isFallback: true,
    };
  }

  const fallback = BTS_FALLBACK_TARIFFS[regionCode] || BTS_FALLBACK_TARIFFS.default;

  return {
    price: fallback.price,
    etaHours: fallback.etaHours,
    isFromCache: false,
    isFallback: true,
  };
}

export function formatBtsEta(etaHours: number, language: 'uz' | 'ru' | 'en'): string {
  if (etaHours <= 24) {
    return language === 'uz'
      ? '24 soat ichida'
      : language === 'ru'
        ? 'В течение 24 часов'
        : 'Within 24 hours';
  }
  if (etaHours <= 48) {
    return language === 'uz'
      ? '48 soat'
      : language === 'ru'
        ? '48 часов'
        : '48 hours';
  }
  return language === 'uz'
    ? '48-72 soat'
    : language === 'ru'
      ? '48-72 часа'
      : '48-72 hours';
}

export function getBtsShippingMessage(
  regionCode: string,
  cityName: string,
  language: 'uz' | 'ru' | 'en'
): string | null {
  if (isBukharaCity(regionCode, cityName)) {
    return language === 'uz'
      ? "Yetkazib berish Buxoro shahar bo'ylab bepul"
      : language === 'ru'
        ? 'Бесплатная доставка по городу Бухара'
        : 'Free delivery within Bukhara city';
  }

  return language === 'uz'
    ? "Yetkazib berish O'zbekiston bo'ylab BTS pochtasi orqali amalga oshiriladi"
    : language === 'ru'
      ? 'Доставка по Узбекистану осуществляется через BTS почту'
      : 'Delivery across Uzbekistan is provided via BTS postal service';
}

export function getDeliveryPriceMessage(
  price: number,
  isFree: boolean,
  isFallback: boolean,
  language: 'uz' | 'ru' | 'en'
): string {
  if (isFree) {
    return language === 'uz'
      ? 'Bepul'
      : language === 'ru'
        ? 'Бесплатно'
        : 'Free';
  }

  const priceStr = price.toLocaleString('uz-UZ');

  if (isFallback) {
    return language === 'uz'
      ? `${priceStr} UZS dan (taxminiy)`
      : language === 'ru'
        ? `от ${priceStr} UZS (приблизительно)`
        : `from ${priceStr} UZS (estimated)`;
  }

  return language === 'uz'
    ? `${priceStr} UZS dan`
    : language === 'ru'
      ? `от ${priceStr} UZS`
      : `from ${priceStr} UZS`;
}
