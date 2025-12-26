import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Loader2, Truck, Clock, Check, Package, Scale } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Region,
  District,
  fetchRegions,
  fetchDistricts,
} from '../../services/addressService';
import {
  getBtsTariff,
  formatBtsEta,
  getBtsShippingMessage,
  getDeliveryPriceMessage,
  formatWeight,
  getWeightPriceBreakdown,
  BtsTariff,
} from '../../services/btsService';

export interface AddressData {
  regionId: string;
  regionCode: string;
  regionName: string;
  district: string;
  street: string;
  addressDetails: string;
  fullAddress: string;
}

export interface DeliveryInfo {
  price: number;
  isFree: boolean;
  etaHours: number;
  etaText: string;
  isFallback: boolean;
  btsMessage: string | null;
  weightKg: number;
}

interface AddressSelectionProps {
  onAddressChange: (address: AddressData | null, deliveryInfo: DeliveryInfo | null) => void;
  onDeliveryCalculated?: (deliveryInfo: DeliveryInfo) => void;
  totalWeightKg: number;
  compact?: boolean;
}

export default function AddressSelection({
  onAddressChange,
  onDeliveryCalculated,
  totalWeightKg,
  compact = false,
}: AddressSelectionProps) {
  const { language } = useLanguage();

  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [addressDetails, setAddressDetails] = useState<string>('');

  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingTariff, setLoadingTariff] = useState(false);

  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);

  const labels = {
    region: language === 'uz' ? 'Viloyat' : language === 'ru' ? 'Область' : 'Region',
    district: language === 'uz' ? 'Tuman/Shahar' : language === 'ru' ? 'Район/Город' : 'District/City',
    street: language === 'uz' ? "Ko'cha yoki qishloq nomi" : language === 'ru' ? 'Улица или село' : 'Street or village name',
    addressDetails: language === 'uz' ? 'Uy, xonadon, qavat' : language === 'ru' ? 'Дом, квартира, этаж' : 'House, apt, floor',
    selectRegion: language === 'uz' ? 'Viloyatni tanlang' : language === 'ru' ? 'Выберите область' : 'Select region',
    selectDistrict: language === 'uz' ? 'Tuman/shaharni tanlang' : language === 'ru' ? 'Выберите район/город' : 'Select district/city',
    loading: language === 'uz' ? 'Yuklanmoqda...' : language === 'ru' ? 'Загрузка...' : 'Loading...',
    freeDelivery: language === 'uz' ? 'Bepul yetkazib berish' : language === 'ru' ? 'Бесплатная доставка' : 'Free delivery',
    deliveryPrice: language === 'uz' ? 'Yetkazib berish narxi' : language === 'ru' ? 'Стоимость доставки' : 'Delivery price',
    estimatedDelivery: language === 'uz' ? 'Yetkazib berish vaqti' : language === 'ru' ? 'Время доставки' : 'Delivery time',
    calculatingPrice: language === 'uz' ? 'Narx hisoblanmoqda...' : language === 'ru' ? 'Расчет стоимости...' : 'Calculating price...',
    totalWeight: language === 'uz' ? "Umumiy og'irlik" : language === 'ru' ? 'Общий вес' : 'Total weight',
  };

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    setLoadingRegions(true);
    const data = await fetchRegions();
    setRegions(data);
    setLoadingRegions(false);
  };

  const handleRegionSelect = (region: Region) => {
    setSelectedRegion(region);
    setSelectedDistrict('');
    setStreet('');
    setAddressDetails('');
    setDeliveryInfo(null);
    onAddressChange(null, null);

    const districtsData = fetchDistricts(region.code);
    setDistricts(districtsData);
  };

  const handleDistrictSelect = async (districtName: string) => {
    setSelectedDistrict(districtName);

    if (!selectedRegion) return;

    setLoadingTariff(true);

    try {
      const tariff = await getBtsTariff(selectedRegion.code, districtName, totalWeightKg);

      const etaText = formatBtsEta(tariff.etaHours, language);
      const btsMessage = getBtsShippingMessage(selectedRegion.code, districtName, language);

      const info: DeliveryInfo = {
        price: tariff.price,
        isFree: tariff.price === 0,
        etaHours: tariff.etaHours,
        etaText,
        isFallback: tariff.isFallback,
        btsMessage,
        weightKg: totalWeightKg,
      };

      setDeliveryInfo(info);
      onDeliveryCalculated?.(info);
    } catch (error) {
      console.error('Error calculating delivery:', error);
      const fallbackInfo: DeliveryInfo = {
        price: 35000,
        isFree: false,
        etaHours: 72,
        etaText: formatBtsEta(72, language),
        isFallback: true,
        btsMessage: getBtsShippingMessage(selectedRegion.code, districtName, language),
        weightKg: totalWeightKg,
      };
      setDeliveryInfo(fallbackInfo);
      onDeliveryCalculated?.(fallbackInfo);
    }

    setLoadingTariff(false);
  };

  useEffect(() => {
    if (selectedRegion && selectedDistrict && deliveryInfo) {
      handleDistrictSelect(selectedDistrict);
    }
  }, [totalWeightKg]);

  const buildFullAddress = useCallback((): string => {
    const parts: string[] = [];
    if (selectedRegion) {
      const regionName = language === 'uz' ? selectedRegion.name_uz :
        language === 'ru' ? selectedRegion.name_ru : selectedRegion.name_en;
      parts.push(regionName);
    }
    if (selectedDistrict) parts.push(selectedDistrict);
    if (street) parts.push(street);
    if (addressDetails) parts.push(addressDetails);
    return parts.join(', ');
  }, [selectedRegion, selectedDistrict, street, addressDetails, language]);

  useEffect(() => {
    if (!selectedRegion || !selectedDistrict || !street || !addressDetails) {
      return;
    }

    const regionName = language === 'uz' ? selectedRegion.name_uz :
      language === 'ru' ? selectedRegion.name_ru : selectedRegion.name_en;

    const addressData: AddressData = {
      regionId: selectedRegion.id,
      regionCode: selectedRegion.code,
      regionName,
      district: selectedDistrict,
      street,
      addressDetails,
      fullAddress: buildFullAddress(),
    };

    onAddressChange(addressData, deliveryInfo);
  }, [
    selectedRegion,
    selectedDistrict,
    street,
    addressDetails,
    deliveryInfo,
    onAddressChange,
    buildFullAddress,
    language,
  ]);

  const inputClass = () =>
    `w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 transition-colors`;

  const selectClass = () =>
    `w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 transition-colors appearance-none bg-white cursor-pointer`;

  return (
    <div className={`space-y-${compact ? '4' : '5'}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Scale className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-blue-800">{labels.totalWeight}</div>
          <div className="text-lg font-bold text-blue-900">{formatWeight(totalWeightKg, language)}</div>
        </div>
      </div>

      <div className={`grid ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'} gap-4`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {labels.region} *
          </label>
          <div className="relative">
            <select
              value={selectedRegion?.code || ''}
              onChange={(e) => {
                const region = regions.find(r => r.code === e.target.value);
                if (region) handleRegionSelect(region);
              }}
              disabled={loadingRegions}
              className={selectClass()}
            >
              <option value="">{labels.selectRegion}</option>
              {regions.map((region) => (
                <option key={region.code} value={region.code}>
                  {language === 'uz' ? region.name_uz :
                    language === 'ru' ? region.name_ru : region.name_en}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            {loadingRegions && (
              <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {labels.district} *
          </label>
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictSelect(e.target.value)}
              disabled={!selectedRegion || districts.length === 0}
              className={selectClass()}
            >
              <option value="">{labels.selectDistrict}</option>
              {districts.map((district) => (
                <option key={district.name} value={district.name}>
                  {district.displayName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          {selectedRegion && districts.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {districts.length} {language === 'uz' ? 'ta tuman/shahar' : language === 'ru' ? 'районов/городов' : 'districts/cities'}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {loadingTariff && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-orange-600 bg-orange-50 rounded-lg px-4 py-3"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">{labels.calculatingPrice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deliveryInfo && !loadingTariff && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className={`rounded-xl p-4 ${deliveryInfo.isFree ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${deliveryInfo.isFree ? 'bg-green-100' : 'bg-orange-100'}`}>
                  <Truck className={`w-5 h-5 ${deliveryInfo.isFree ? 'text-green-600' : 'text-orange-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold ${deliveryInfo.isFree ? 'text-green-800' : 'text-orange-800'}`}>
                      {labels.deliveryPrice}
                    </span>
                    {deliveryInfo.isFree ? (
                      <span className="flex items-center gap-1 text-green-600 font-bold">
                        <Check className="w-4 h-4" />
                        {labels.freeDelivery}
                      </span>
                    ) : (
                      <span className="text-orange-600 font-bold">
                        {getDeliveryPriceMessage(deliveryInfo.price, false, deliveryInfo.isFallback, language)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{labels.estimatedDelivery}: {deliveryInfo.etaText}</span>
                  </div>
                  {!deliveryInfo.isFree && (
                    <div className="text-xs text-gray-500 mt-2">
                      {getWeightPriceBreakdown(totalWeightKg, language)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {deliveryInfo.btsMessage && !deliveryInfo.isFree && (
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-4 py-3 border border-blue-200">
                <Package className="w-4 h-4 flex-shrink-0" />
                <span>{deliveryInfo.btsMessage}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {selectedDistrict && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {labels.street} *
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder={language === 'uz' ? "Masalan: Navoiy ko'chasi, Mustaqillik qishlog'i" : language === 'ru' ? 'Например: улица Навои, село Мустакиллик' : 'e.g. Navoiy street, Mustaqillik village'}
                className={inputClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {labels.addressDetails} *
              </label>
              <input
                type="text"
                value={addressDetails}
                onChange={(e) => setAddressDetails(e.target.value)}
                placeholder={language === 'uz' ? 'Uy 15, 3-xonadon, 2-qavat' : language === 'ru' ? 'Дом 15, кв. 3, 2-й этаж' : 'House 15, apt 3, 2nd floor'}
                className={inputClass()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedRegion && selectedDistrict && street && addressDetails && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
        >
          <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <span>{buildFullAddress()}</span>
        </motion.div>
      )}
    </div>
  );
}
