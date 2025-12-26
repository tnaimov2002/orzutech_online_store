import { supabase } from '../lib/supabase';
import { isBukharaCity } from './addressService';

export interface BtsTariff {
  price: number;
  etaHours: number;
  isFromCache: boolean;
  isFallback: boolean;
  weightKg: number;
}

const BTS_BASE_PRICE = 35000;
const BTS_ADDITIONAL_KG_PRICE = 5000;

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

const memoryCache = new Map<string, { tariff: BtsTariff; timestamp: number }>();

function getCacheKey(regionCode: string, cityName?: string): string {
  return cityName ? `${regionCode}:${cityName.toLowerCase()}` : regionCode;
}

export function calculateBtsPrice(weightKg: number): number {
  if (weightKg <= 1) {
    return BTS_BASE_PRICE;
  }
  const additionalKg = Math.ceil(weightKg - 1);
  return BTS_BASE_PRICE + (additionalKg * BTS_ADDITIONAL_KG_PRICE);
}

export function getEtaHours(regionCode: string, cityName: string): number {
  if (isBukharaCity(regionCode, cityName)) {
    return 24;
  }
  if (regionCode === 'bukhara') {
    return 48;
  }
  return 72;
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
      weightKg,
    };
  }

  const price = calculateBtsPrice(weightKg);
  const etaHours = getEtaHours(regionCode, cityName);

  const cacheKey = getCacheKey(regionCode, cityName);
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_DURATION_MS) {
    const cachedPrice = calculateBtsPrice(weightKg);
    return {
      ...memoryCached.tariff,
      price: cachedPrice,
      weightKg,
      isFromCache: true,
    };
  }

  try {
    const dbTariff = await getDbCachedTariff(regionCode, cityName, weightKg);
    if (dbTariff) {
      memoryCache.set(cacheKey, { tariff: dbTariff, timestamp: Date.now() });
      return dbTariff;
    }
  } catch (error) {
    console.error('Error fetching DB cached tariff:', error);
  }

  const tariff: BtsTariff = {
    price,
    etaHours,
    isFromCache: false,
    isFallback: true,
    weightKg,
  };

  memoryCache.set(cacheKey, { tariff, timestamp: Date.now() });
  return tariff;
}

async function getDbCachedTariff(
  regionCode: string,
  cityName: string,
  weightKg: number
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
      weightKg,
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
    if (cityOverride.is_free_delivery) {
      return {
        price: 0,
        etaHours: cityOverride.delivery_eta_hours ?? regionData.delivery_eta_hours,
        isFromCache: false,
        isFallback: false,
        weightKg,
      };
    }
    if (cityOverride.delivery_price !== null) {
      return {
        price: cityOverride.delivery_price,
        etaHours: cityOverride.delivery_eta_hours ?? regionData.delivery_eta_hours,
        isFromCache: cityOverride.bts_tariff_cached !== null,
        isFallback: false,
        weightKg,
      };
    }
  }

  const price = calculateBtsPrice(weightKg);

  return {
    price,
    etaHours: regionData.delivery_eta_hours,
    isFromCache: false,
    isFallback: false,
    weightKg,
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
      ? `${priceStr} UZS (taxminiy)`
      : language === 'ru'
        ? `${priceStr} UZS (приблизительно)`
        : `${priceStr} UZS (estimated)`;
  }

  return `${priceStr} UZS`;
}

export function formatWeight(weightKg: number, language: 'uz' | 'ru' | 'en'): string {
  const weightStr = weightKg.toFixed(1).replace('.0', '');
  return language === 'uz'
    ? `${weightStr} kg`
    : language === 'ru'
      ? `${weightStr} кг`
      : `${weightStr} kg`;
}

export function getWeightPriceBreakdown(
  weightKg: number,
  language: 'uz' | 'ru' | 'en'
): string {
  if (weightKg <= 1) {
    return language === 'uz'
      ? `1 kg gacha: ${BTS_BASE_PRICE.toLocaleString()} UZS`
      : language === 'ru'
        ? `До 1 кг: ${BTS_BASE_PRICE.toLocaleString()} UZS`
        : `Up to 1 kg: ${BTS_BASE_PRICE.toLocaleString()} UZS`;
  }

  const additionalKg = Math.ceil(weightKg - 1);
  const additionalCost = additionalKg * BTS_ADDITIONAL_KG_PRICE;

  return language === 'uz'
    ? `1 kg: ${BTS_BASE_PRICE.toLocaleString()} + ${additionalKg} kg x ${BTS_ADDITIONAL_KG_PRICE.toLocaleString()} = ${(BTS_BASE_PRICE + additionalCost).toLocaleString()} UZS`
    : language === 'ru'
      ? `1 кг: ${BTS_BASE_PRICE.toLocaleString()} + ${additionalKg} кг x ${BTS_ADDITIONAL_KG_PRICE.toLocaleString()} = ${(BTS_BASE_PRICE + additionalCost).toLocaleString()} UZS`
      : `1 kg: ${BTS_BASE_PRICE.toLocaleString()} + ${additionalKg} kg x ${BTS_ADDITIONAL_KG_PRICE.toLocaleString()} = ${(BTS_BASE_PRICE + additionalCost).toLocaleString()} UZS`;
}
