import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Truck,
  Store,
  MapPin,
  Clock,
  Phone,
  Gift,
  ChevronRight,
  Check,
  ExternalLink
} from 'lucide-react';
import { StoreLocation } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { formatPrice, generateOrderNumber } from '../utils/format';
import { validateEmail, sendOrderConfirmationEmail } from '../utils/email';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AddressSelection, { AddressData } from '../components/checkout/AddressSelection';
import { DeliveryInfo } from '../services/addressService';

type DeliveryType = 'delivery' | 'pickup';

export default function Checkout() {
  const { t, language, getLocalizedField } = useLanguage();
  const { items, getTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
    giftWrapping: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (orderCompleted) return;
    if (items.length === 0) {
      navigate('/cart');
      return;
    }
    fetchStoreLocations();
  }, [items, navigate, orderCompleted]);

  const fetchStoreLocations = async () => {
    const { data } = await supabase
      .from('store_locations')
      .select('*')
      .eq('is_active', true);

    if (data) {
      setStoreLocations(data);
      if (data.length > 0) {
        setSelectedStore(data[0].id);
      }
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddressChange = useCallback((address: AddressData, delivery: DeliveryInfo) => {
    setAddressData(address);
    setDeliveryInfo(delivery);
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = language === 'uz' ? 'Ism majburiy' : language === 'ru' ? 'Имя обязательно' : 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = language === 'uz' ? 'Familiya majburiy' : language === 'ru' ? 'Фамилия обязательна' : 'Last name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = language === 'uz' ? 'Telefon majburiy' : language === 'ru' ? 'Телефон обязателен' : 'Phone is required';
    }
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = language === 'uz' ? "To'g'ri email kiriting" : language === 'ru' ? 'Введите корректный email' : 'Enter a valid email';
    }

    if (deliveryType === 'delivery' && !addressData) {
      newErrors.address = language === 'uz' ? 'Manzilni to\'liq kiriting' : language === 'ru' ? 'Заполните адрес полностью' : 'Please complete the address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          email: formData.email || null,
          region: addressData?.regionName || null,
          city: addressData?.district || null,
          address: addressData?.fullAddress || null,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      const orderNumber = generateOrderNumber();
      const subtotal = getTotal();
      const deliveryFee = deliveryType === 'delivery' ? (deliveryInfo?.price || 0) : 0;
      const total = subtotal + deliveryFee;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerData.id,
          status: 'new',
          delivery_type: deliveryType,
          delivery_address: deliveryType === 'delivery' ? addressData?.fullAddress : null,
          store_location_id: deliveryType === 'pickup' ? selectedStore : null,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          notes: formData.notes || null,
          gift_wrapping: formData.giftWrapping,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: getLocalizedField(item.product, 'name'),
        product_image: item.product.product_images?.[0]?.image_url || null,
        variant_info: Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ') || null,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
      }));

      await supabase.from('order_items').insert(orderItems);

      await supabase
        .from('customers')
        .update({
          total_spent: customerData.total_spent + total,
          order_count: customerData.order_count + 1,
          last_activity: new Date().toISOString(),
        })
        .eq('id', customerData.id);

      let storeName: string | null = null;
      if (deliveryType === 'pickup' && selectedStore) {
        const store = storeLocations.find(s => s.id === selectedStore);
        if (store) {
          storeName = getLocalizedField(store, 'name');
        }
      }

      if (formData.email) {
        await sendOrderConfirmationEmail({
          to: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          orderNumber: orderNumber,
          orderItems: orderItems.map(item => ({
            product_name: item.product_name,
            product_image: item.product_image,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            variant_info: item.variant_info,
          })),
          subtotal,
          deliveryFee,
          total,
          deliveryType: deliveryType,
          deliveryAddress: addressData?.fullAddress || null,
          storeName: storeName,
          language: language as 'uz' | 'ru' | 'en',
        });
      }

      setOrderCompleted(true);
      clearCart();
      navigate(`/order-success/${orderData.id}`);
    } catch (error) {
      console.error('Order error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const subtotal = getTotal();
  const deliveryFee = deliveryType === 'delivery' ? (deliveryInfo?.price || 0) : 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900 mb-8"
        >
          {t.checkout.title}
        </motion.h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6">{t.checkout.deliveryType}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDeliveryType('delivery')}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      deliveryType === 'delivery'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        deliveryType === 'delivery' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{t.checkout.delivery}</h3>
                        <p className="text-sm text-gray-500">{t.checkout.deliveryRules}</p>
                      </div>
                      {deliveryType === 'delivery' && (
                        <Check className="w-5 h-5 text-orange-500 ml-auto" />
                      )}
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDeliveryType('pickup')}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      deliveryType === 'pickup'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        deliveryType === 'pickup' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Store className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{t.checkout.pickup}</h3>
                        <p className="text-sm text-gray-500">{t.checkout.selectStore}</p>
                      </div>
                      {deliveryType === 'pickup' && (
                        <Check className="w-5 h-5 text-orange-500 ml-auto" />
                      )}
                    </div>
                  </motion.button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {language === 'uz' ? 'Shaxsiy ma\'lumotlar' : language === 'ru' ? 'Личные данные' : 'Personal Information'}
                </h2>

                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.checkout.firstName} *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border ${errors.firstName ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500`}
                    />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.checkout.lastName} *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border ${errors.lastName ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500`}
                    />
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.checkout.phone} *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+998 90 123 45 67"
                      className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500`}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.checkout.email} <span className="text-gray-400 font-normal">({language === 'uz' ? 'ixtiyoriy' : language === 'ru' ? 'необязательно' : 'optional'})</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="example@email.com"
                      className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>
              </motion.div>

              {deliveryType === 'delivery' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t.checkout.deliveryInfo}</h2>

                  <div className="bg-orange-50 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-orange-800 mb-2">{t.checkout.deliveryRules}</h3>
                    <ul className="space-y-1 text-sm text-orange-700">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {language === 'uz' ? 'Buxoro shahrida - BEPUL' : language === 'ru' ? 'В городе Бухара - БЕСПЛАТНО' : 'In Bukhara city - FREE'}
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {language === 'uz' ? 'Buxoro viloyati - 50,000 UZS dan' : language === 'ru' ? 'Бухарская область - от 50,000 UZS' : 'Bukhara region - from 50,000 UZS'}
                      </li>
                      <li className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        {language === 'uz' ? 'Boshqa viloyatlar - 100,000 UZS dan' : language === 'ru' ? 'Другие области - от 100,000 UZS' : 'Other regions - from 100,000 UZS'}
                      </li>
                    </ul>
                  </div>

                  <AddressSelection
                    onAddressChange={handleAddressChange}
                  />

                  {errors.address && (
                    <p className="text-red-500 text-sm mt-4">{errors.address}</p>
                  )}

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.checkout.notes}
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 resize-none"
                      />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="giftWrapping"
                        checked={formData.giftWrapping}
                        onChange={handleInputChange}
                        className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <Gift className="w-5 h-5 text-orange-500" />
                      <span className="font-medium text-gray-700">{t.checkout.giftWrapping}</span>
                    </label>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-6">{t.checkout.selectStore}</h2>

                  <div className="space-y-4">
                    {storeLocations.map((store) => (
                      <motion.button
                        key={store.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        onClick={() => setSelectedStore(store.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selectedStore === store.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {getLocalizedField(store, 'name')}
                            </h3>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <p className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                {getLocalizedField(store, 'address')}
                              </p>
                              <p className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                {store.working_hours}
                              </p>
                              {store.phone && (
                                <p className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  {store.phone}
                                </p>
                              )}
                            </div>
                            {store.maps_url && (
                              <a
                                href={store.maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 mt-2 text-sm text-orange-500 hover:text-orange-600"
                              >
                                {t.checkout.getDirections}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {selectedStore === store.id && (
                            <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-6">{t.checkout.orderSummary}</h2>

                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <img
                        src={item.product.product_images?.[0]?.image_url || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=100'}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {getLocalizedField(item.product, 'name')}
                        </p>
                        <p className="text-sm text-gray-500">x{item.quantity}</p>
                        <p className="font-semibold text-gray-900">
                          {formatPrice(item.product.price * item.quantity)} {t.common.sum}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t.cart.subtotal}</span>
                    <span className="font-medium">{formatPrice(subtotal)} {t.common.sum}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t.checkout.deliveryFee}</span>
                    {deliveryType === 'pickup' ? (
                      <span className="font-medium text-green-600">{t.checkout.free}</span>
                    ) : deliveryInfo?.isFree ? (
                      <span className="font-medium text-green-600">{t.checkout.free}</span>
                    ) : (
                      <span className="font-medium">{formatPrice(deliveryFee)} {t.common.sum}</span>
                    )}
                  </div>
                  {deliveryType === 'delivery' && deliveryInfo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {language === 'uz' ? 'Yetkazib berish vaqti' : language === 'ru' ? 'Время доставки' : 'Delivery time'}
                      </span>
                      <span className="font-medium text-orange-600">{deliveryInfo.etaText}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100">
                    <span className="text-gray-900">{t.cart.total}</span>
                    <span className="text-orange-500">{formatPrice(total)} {t.common.sum}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-colors"
                >
                  {submitting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      {t.checkout.placeOrder}
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
