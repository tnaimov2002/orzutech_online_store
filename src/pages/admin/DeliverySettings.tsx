import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  MapPin,
  DollarSign,
  Clock,
  Save,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeliverySetting {
  id: string;
  region_code: string;
  region_name_uz: string;
  region_name_ru: string;
  region_name_en: string;
  base_delivery_price: number;
  is_free_delivery: boolean;
  delivery_eta_hours: number;
  is_active: boolean;
  sort_order: number;
}

interface CityOverride {
  id: string;
  region_id: string;
  city_name: string;
  city_name_ru: string | null;
  city_name_en: string | null;
  delivery_price: number | null;
  is_free_delivery: boolean;
  delivery_eta_hours: number | null;
  is_active: boolean;
}

export default function DeliverySettings() {
  const [regions, setRegions] = useState<DeliverySetting[]>([]);
  const [cityOverrides, setCityOverrides] = useState<CityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRegion, setEditingRegion] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCity, setNewCity] = useState({
    city_name: '',
    city_name_ru: '',
    city_name_en: '',
    delivery_price: 0,
    is_free_delivery: false,
    delivery_eta_hours: 48,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [regionsRes, citiesRes] = await Promise.all([
      supabase.from('delivery_settings').select('*').order('sort_order'),
      supabase.from('city_delivery_overrides').select('*'),
    ]);

    if (regionsRes.data) setRegions(regionsRes.data);
    if (citiesRes.data) setCityOverrides(citiesRes.data);
    setLoading(false);
  };

  const handleRegionUpdate = async (region: DeliverySetting) => {
    setSaving(true);
    const { error } = await supabase
      .from('delivery_settings')
      .update({
        base_delivery_price: region.base_delivery_price,
        is_free_delivery: region.is_free_delivery,
        delivery_eta_hours: region.delivery_eta_hours,
        is_active: region.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', region.id);

    if (!error) {
      setEditingRegion(null);
    }
    setSaving(false);
  };

  const handleCityUpdate = async (city: CityOverride) => {
    setSaving(true);
    const { error } = await supabase
      .from('city_delivery_overrides')
      .update({
        delivery_price: city.is_free_delivery ? null : city.delivery_price,
        is_free_delivery: city.is_free_delivery,
        delivery_eta_hours: city.delivery_eta_hours,
        is_active: city.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', city.id);

    if (!error) {
      setEditingCity(null);
    }
    setSaving(false);
  };

  const handleAddCity = async () => {
    if (!selectedRegion || !newCity.city_name) return;

    setSaving(true);
    const { error } = await supabase.from('city_delivery_overrides').insert({
      region_id: selectedRegion,
      city_name: newCity.city_name,
      city_name_ru: newCity.city_name_ru || null,
      city_name_en: newCity.city_name_en || null,
      delivery_price: newCity.is_free_delivery ? null : newCity.delivery_price,
      is_free_delivery: newCity.is_free_delivery,
      delivery_eta_hours: newCity.delivery_eta_hours,
      is_active: true,
    });

    if (!error) {
      setShowAddCity(false);
      setNewCity({
        city_name: '',
        city_name_ru: '',
        city_name_en: '',
        delivery_price: 0,
        is_free_delivery: false,
        delivery_eta_hours: 48,
      });
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteCity = async (cityId: string) => {
    if (!confirm('Haqiqatan ham bu shaharni o\'chirmoqchimisiz?')) return;

    const { error } = await supabase
      .from('city_delivery_overrides')
      .delete()
      .eq('id', cityId);

    if (!error) {
      setCityOverrides(prev => prev.filter(c => c.id !== cityId));
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('uz-UZ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yetkazib berish sozlamalari</h1>
          <p className="text-gray-500 mt-1">Viloyatlar va shaharlar bo'yicha yetkazib berish narxlarini boshqaring</p>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-800">Yetkazib berish qoidalari</h3>
            <ul className="text-sm text-orange-700 mt-1 space-y-1">
              <li>Buxoro shahrida - BEPUL (24 soat ichida)</li>
              <li>Buxoro viloyati - 50,000 UZS dan (48 soat ichida)</li>
              <li>Boshqa viloyatlar - 100,000 UZS dan (48-72 soat)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Viloyatlar bo'yicha sozlamalar
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viloyat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Narx (UZS)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bepul</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA (soat)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holat</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {regions.map((region) => (
                <tr
                  key={region.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selectedRegion === region.id ? 'bg-orange-50' : ''}`}
                  onClick={() => setSelectedRegion(selectedRegion === region.id ? null : region.id)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{region.region_name_uz}</p>
                      <p className="text-xs text-gray-500">{region.region_name_ru}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingRegion === region.id ? (
                      <input
                        type="number"
                        value={region.base_delivery_price}
                        onChange={(e) => setRegions(prev =>
                          prev.map(r => r.id === region.id
                            ? { ...r, base_delivery_price: parseInt(e.target.value) || 0 }
                            : r
                          )
                        )}
                        onClick={(e) => e.stopPropagation()}
                        className="w-32 px-2 py-1 border rounded"
                      />
                    ) : (
                      <span className={region.is_free_delivery ? 'text-green-600 font-medium' : ''}>
                        {region.is_free_delivery ? 'BEPUL' : `${formatPrice(region.base_delivery_price)} UZS`}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingRegion === region.id ? (
                      <input
                        type="checkbox"
                        checked={region.is_free_delivery}
                        onChange={(e) => setRegions(prev =>
                          prev.map(r => r.id === region.id
                            ? { ...r, is_free_delivery: e.target.checked }
                            : r
                          )
                        )}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4"
                      />
                    ) : (
                      region.is_free_delivery && <Check className="w-4 h-4 text-green-600" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingRegion === region.id ? (
                      <input
                        type="number"
                        value={region.delivery_eta_hours}
                        onChange={(e) => setRegions(prev =>
                          prev.map(r => r.id === region.id
                            ? { ...r, delivery_eta_hours: parseInt(e.target.value) || 24 }
                            : r
                          )
                        )}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 px-2 py-1 border rounded"
                      />
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {region.delivery_eta_hours}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingRegion === region.id ? (
                      <input
                        type="checkbox"
                        checked={region.is_active}
                        onChange={(e) => setRegions(prev =>
                          prev.map(r => r.id === region.id
                            ? { ...r, is_active: e.target.checked }
                            : r
                          )
                        )}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4"
                      />
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        region.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {region.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingRegion === region.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegionUpdate(region);
                          }}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRegion(null);
                            fetchData();
                          }}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRegion(region.id);
                        }}
                        className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRegion && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-500" />
              Shahar/Tuman bo'yicha alohida narxlar
              <span className="text-sm font-normal text-gray-500">
                ({regions.find(r => r.id === selectedRegion)?.region_name_uz})
              </span>
            </h2>
            <button
              onClick={() => setShowAddCity(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" />
              Shahar qo'shish
            </button>
          </div>

          {showAddCity && (
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-4">Yangi shahar/tuman qo'shish</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (UZ) *</label>
                  <input
                    type="text"
                    value={newCity.city_name}
                    onChange={(e) => setNewCity(prev => ({ ...prev, city_name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Masalan: Kogon tumani"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (RU)</label>
                  <input
                    type="text"
                    value={newCity.city_name_ru}
                    onChange={(e) => setNewCity(prev => ({ ...prev, city_name_ru: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomi (EN)</label>
                  <input
                    type="text"
                    value={newCity.city_name_en}
                    onChange={(e) => setNewCity(prev => ({ ...prev, city_name_en: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Narx (UZS)</label>
                  <input
                    type="number"
                    value={newCity.delivery_price}
                    onChange={(e) => setNewCity(prev => ({ ...prev, delivery_price: parseInt(e.target.value) || 0 }))}
                    disabled={newCity.is_free_delivery}
                    className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ETA (soat)</label>
                  <input
                    type="number"
                    value={newCity.delivery_eta_hours}
                    onChange={(e) => setNewCity(prev => ({ ...prev, delivery_eta_hours: parseInt(e.target.value) || 24 }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCity.is_free_delivery}
                      onChange={(e) => setNewCity(prev => ({ ...prev, is_free_delivery: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">Bepul yetkazib berish</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowAddCity(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleAddCity}
                  disabled={!newCity.city_name || saving}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Qo\'shish'}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shahar/Tuman</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Narx</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bepul</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holat</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cityOverrides
                  .filter(c => c.region_id === selectedRegion)
                  .map((city) => (
                    <tr key={city.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{city.city_name}</p>
                          {city.city_name_ru && <p className="text-xs text-gray-500">{city.city_name_ru}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {editingCity === city.id ? (
                          <input
                            type="number"
                            value={city.delivery_price || 0}
                            onChange={(e) => setCityOverrides(prev =>
                              prev.map(c => c.id === city.id
                                ? { ...c, delivery_price: parseInt(e.target.value) || 0 }
                                : c
                              )
                            )}
                            disabled={city.is_free_delivery}
                            className="w-32 px-2 py-1 border rounded disabled:bg-gray-100"
                          />
                        ) : (
                          <span className={city.is_free_delivery ? 'text-green-600 font-medium' : ''}>
                            {city.is_free_delivery ? 'BEPUL' : `${formatPrice(city.delivery_price || 0)} UZS`}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingCity === city.id ? (
                          <input
                            type="checkbox"
                            checked={city.is_free_delivery}
                            onChange={(e) => setCityOverrides(prev =>
                              prev.map(c => c.id === city.id
                                ? { ...c, is_free_delivery: e.target.checked }
                                : c
                              )
                            )}
                            className="w-4 h-4"
                          />
                        ) : (
                          city.is_free_delivery && <Check className="w-4 h-4 text-green-600" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingCity === city.id ? (
                          <input
                            type="number"
                            value={city.delivery_eta_hours || 24}
                            onChange={(e) => setCityOverrides(prev =>
                              prev.map(c => c.id === city.id
                                ? { ...c, delivery_eta_hours: parseInt(e.target.value) || 24 }
                                : c
                              )
                            )}
                            className="w-20 px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {city.delivery_eta_hours || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingCity === city.id ? (
                          <input
                            type="checkbox"
                            checked={city.is_active}
                            onChange={(e) => setCityOverrides(prev =>
                              prev.map(c => c.id === city.id
                                ? { ...c, is_active: e.target.checked }
                                : c
                              )
                            )}
                            className="w-4 h-4"
                          />
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            city.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {city.is_active ? 'Faol' : 'Nofaol'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingCity === city.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCityUpdate(city)}
                              disabled={saving}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingCity(null);
                                fetchData();
                              }}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingCity(city.id)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCity(city.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                {cityOverrides.filter(c => c.region_id === selectedRegion).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Bu viloyat uchun alohida shahar/tuman narxlari yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
