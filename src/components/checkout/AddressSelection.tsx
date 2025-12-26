import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Loader2, AlertCircle, Check, Truck, Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Region,
  District,
  Street,
  DeliveryInfo,
  CityOverride,
  fetchRegions,
  fetchDistricts,
  fetchStreets,
  fetchCityOverrides,
  calculateDeliveryInfo,
} from '../../services/addressService';

export interface AddressData {
  regionId: string;
  regionCode: string;
  regionName: string;
  district: string;
  street: string;
  streetManual: string;
  addressDetails: string;
  fullAddress: string;
}

interface AddressSelectionProps {
  onAddressChange: (address: AddressData, deliveryInfo: DeliveryInfo) => void;
  compact?: boolean;
  initialAddress?: Partial<AddressData>;
}

export default function AddressSelection({
  onAddressChange,
  compact = false,
  initialAddress,
}: AddressSelectionProps) {
  const { language } = useLanguage();

  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [streets, setStreets] = useState<Street[]>([]);
  const [cityOverrides, setCityOverrides] = useState<CityOverride[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedStreet, setSelectedStreet] = useState<string>('');
  const [manualStreet, setManualStreet] = useState<string>('');
  const [addressDetails, setAddressDetails] = useState<string>('');

  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);

  const [streetFallback, setStreetFallback] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const labels = {
    region: language === 'uz' ? 'Viloyat' : language === 'ru' ? 'Область' : 'Region',
    district: language === 'uz' ? 'Tuman/Shahar' : language === 'ru' ? 'Район/Город' : 'District/City',
    street: language === 'uz' ? 'Ko\'cha' : language === 'ru' ? 'Улица' : 'Street',
    streetManual: language === 'uz' ? 'Ko\'cha nomi' : language === 'ru' ? 'Название улицы' : 'Street name',
    addressDetails: language === 'uz' ? 'Uy, xonadon, qavat' : language === 'ru' ? 'Дом, квартира, этаж' : 'House, apt, floor',
    selectRegion: language === 'uz' ? 'Viloyatni tanlang' : language === 'ru' ? 'Выберите область' : 'Select region',
    selectDistrict: language === 'uz' ? 'Tuman/shaharni tanlang' : language === 'ru' ? 'Выберите район/город' : 'Select district/city',
    selectStreet: language === 'uz' ? 'Ko\'chani tanlang' : language === 'ru' ? 'Выберите улицу' : 'Select street',
    streetNotFound: language === 'uz' ? 'Ko\'cha topilmadi. Iltimos, qo\'lda kiriting.' : language === 'ru' ? 'Улица не найдена. Введите вручную.' : 'Street not found. Please enter manually.',
    loading: language === 'uz' ? 'Yuklanmoqda...' : language === 'ru' ? 'Загрузка...' : 'Loading...',
    freeDelivery: language === 'uz' ? 'Bepul yetkazib berish' : language === 'ru' ? 'Бесплатная доставка' : 'Free delivery',
    deliveryPrice: language === 'uz' ? 'Yetkazib berish narxi' : language === 'ru' ? 'Стоимость доставки' : 'Delivery price',
    estimatedDelivery: language === 'uz' ? 'Taxminiy yetkazib berish' : language === 'ru' ? 'Ориентировочная доставка' : 'Estimated delivery',
  };

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    setLoadingRegions(true);
    const data = await fetchRegions();
    setRegions(data);
    setLoadingRegions(false);

    if (initialAddress?.regionCode) {
      const region = data.find(r => r.code === initialAddress.regionCode);
      if (region) {
        handleRegionSelect(region);
      }
    }
  };

  const handleRegionSelect = async (region: Region) => {
    setSelectedRegion(region);
    setSelectedDistrict('');
    setSelectedStreet('');
    setManualStreet('');
    setStreetFallback(false);
    setDistricts([]);
    setStreets([]);

    setLoadingDistricts(true);
    const [districtsData, overridesData] = await Promise.all([
      fetchDistricts(region.code),
      fetchCityOverrides(region.id),
    ]);
    setDistricts(districtsData);
    setCityOverrides(overridesData);
    setLoadingDistricts(false);

    const info = calculateDeliveryInfo(region, '', overridesData, language);
    setDeliveryInfo(info);
  };

  const handleDistrictSelect = async (districtName: string) => {
    setSelectedDistrict(districtName);
    setSelectedStreet('');
    setManualStreet('');
    setStreetFallback(false);
    setStreets([]);

    if (selectedRegion) {
      const info = calculateDeliveryInfo(selectedRegion, districtName, cityOverrides, language);
      setDeliveryInfo(info);
    }

    setLoadingStreets(true);
    try {
      const streetsData = await fetchStreets(selectedRegion?.code || '', districtName);
      if (streetsData.length === 0) {
        setStreetFallback(true);
      } else {
        setStreets(streetsData);
        setStreetFallback(false);
      }
    } catch {
      setStreetFallback(true);
    }
    setLoadingStreets(false);
  };

  const handleStreetSelect = (streetName: string) => {
    setSelectedStreet(streetName);
    setManualStreet('');
  };

  const buildFullAddress = useCallback((): string => {
    const parts: string[] = [];
    if (selectedRegion) {
      const regionName = language === 'uz' ? selectedRegion.name_uz :
        language === 'ru' ? selectedRegion.name_ru : selectedRegion.name_en;
      parts.push(regionName);
    }
    if (selectedDistrict) parts.push(selectedDistrict);
    if (selectedStreet) parts.push(selectedStreet);
    if (manualStreet) parts.push(manualStreet);
    if (addressDetails) parts.push(addressDetails);
    return parts.join(', ');
  }, [selectedRegion, selectedDistrict, selectedStreet, manualStreet, addressDetails, language]);

  useEffect(() => {
    if (!selectedRegion || !selectedDistrict || !addressDetails) {
      return;
    }

    const streetValue = streetFallback ? manualStreet : selectedStreet;
    if (!streetFallback && !selectedStreet) return;
    if (streetFallback && !manualStreet) return;

    const regionName = language === 'uz' ? selectedRegion.name_uz :
      language === 'ru' ? selectedRegion.name_ru : selectedRegion.name_en;

    const addressData: AddressData = {
      regionId: selectedRegion.id,
      regionCode: selectedRegion.code,
      regionName,
      district: selectedDistrict,
      street: streetFallback ? '' : selectedStreet,
      streetManual: streetFallback ? manualStreet : '',
      addressDetails,
      fullAddress: buildFullAddress(),
    };

    if (deliveryInfo) {
      onAddressChange(addressData, deliveryInfo);
    }
  }, [
    selectedRegion,
    selectedDistrict,
    selectedStreet,
    manualStreet,
    addressDetails,
    streetFallback,
    deliveryInfo,
    onAddressChange,
    buildFullAddress,
    language,
  ]);

  const inputClass = (error?: string) =>
    `w-full px-4 py-3 rounded-xl border ${error ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500 transition-colors`;

  const selectClass = (error?: string) =>
    `w-full px-4 py-3 rounded-xl border ${error ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500 transition-colors appearance-none bg-white cursor-pointer`;

  return (
    <div className={`space-y-${compact ? '4' : '5'}`}>
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
              className={selectClass(errors.region)}
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
          {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {labels.district} *
          </label>
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictSelect(e.target.value)}
              disabled={!selectedRegion || loadingDistricts}
              className={selectClass(errors.district)}
            >
              <option value="">{labels.selectDistrict}</option>
              {districts.map((district) => (
                <option key={district.name} value={district.name}>
                  {district.displayName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            {loadingDistricts && (
              <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
            )}
          </div>
          {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedDistrict && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {loadingStreets ? (
              <div className="flex items-center gap-2 text-gray-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{labels.loading}</span>
              </div>
            ) : streetFallback ? (
              <div>
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{labels.streetNotFound}</span>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {labels.streetManual} *
                </label>
                <input
                  type="text"
                  value={manualStreet}
                  onChange={(e) => setManualStreet(e.target.value)}
                  placeholder={language === 'uz' ? 'Masalan: Navoiy ko\'chasi' : language === 'ru' ? 'Например: улица Навои' : 'e.g. Navoiy street'}
                  className={inputClass(errors.street)}
                />
                {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
              </div>
            ) : streets.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {labels.street} *
                </label>
                <div className="relative">
                  <select
                    value={selectedStreet}
                    onChange={(e) => handleStreetSelect(e.target.value)}
                    className={selectClass(errors.street)}
                  >
                    <option value="">{labels.selectStreet}</option>
                    {streets.map((street) => (
                      <option key={street.name} value={street.name}>
                        {street.displayName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {labels.streetManual} *
                </label>
                <input
                  type="text"
                  value={manualStreet}
                  onChange={(e) => setManualStreet(e.target.value)}
                  placeholder={language === 'uz' ? 'Ko\'cha nomini kiriting' : language === 'ru' ? 'Введите название улицы' : 'Enter street name'}
                  className={inputClass(errors.street)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {labels.addressDetails} *
              </label>
              <input
                type="text"
                value={addressDetails}
                onChange={(e) => setAddressDetails(e.target.value)}
                placeholder={language === 'uz' ? 'Uy 15, 3-xonadon, 2-qavat' : language === 'ru' ? 'Дом 15, кв. 3, 2-й этаж' : 'House 15, apt 3, 2nd floor'}
                className={inputClass(errors.addressDetails)}
              />
              {errors.addressDetails && <p className="text-red-500 text-xs mt-1">{errors.addressDetails}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deliveryInfo && selectedRegion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-xl p-4 ${deliveryInfo.isFree ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}
          >
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
                      {deliveryInfo.price.toLocaleString()} UZS
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{labels.estimatedDelivery}: {deliveryInfo.etaText}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedRegion && selectedDistrict && (selectedStreet || manualStreet) && addressDetails && (
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
