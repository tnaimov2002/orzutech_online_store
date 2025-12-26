import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Truck,
  Store,
  MapPin,
  Clock,
  Phone as PhoneIcon,
  Check,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  Package,
  ShoppingBag,
  Home,
  Loader2,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { Product, StoreLocation } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { formatPrice, generateOrderNumber } from '../../utils/format';
import { validateEmail, sendOrderConfirmationEmail } from '../../utils/email';
import AddressSelection, { AddressData, DeliveryInfo } from '../checkout/AddressSelection';

interface DirectCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  quantity: number;
  selectedVariants: Record<string, string>;
}

type DeliveryType = 'delivery' | 'pickup';
type CheckoutStep = 'form' | 'success';

interface OrderResult {
  id: string;
  order_number: string;
  total: number;
  emailSent: boolean;
  emailError?: string;
}

export default function DirectCheckoutModal({
  isOpen,
  onClose,
  product,
  quantity,
  selectedVariants
}: DirectCheckoutModalProps) {
  const navigate = useNavigate();
  const { t, language, getLocalizedField } = useLanguage();

  const [step, setStep] = useState<CheckoutStep>('form');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setStep('form');
      setOrderResult(null);
      fetchStoreLocations();
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchStoreLocations = async () => {
    setLoading(true);
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddressChange = useCallback((address: AddressData | null, delivery: DeliveryInfo | null) => {
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
      newErrors.phone = language === 'uz' ? 'Telefon raqam majburiy' : language === 'ru' ? 'Телефон обязателен' : 'Phone is required';
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
      const subtotal = product.price * quantity;
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
          gift_wrapping: false,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const variantInfo = Object.entries(selectedVariants)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || null;

      const productName = getLocalizedField(product, 'name');
      const productImage = product.product_images?.[0]?.image_url || null;

      await supabase.from('order_items').insert({
        order_id: orderData.id,
        product_id: product.id,
        product_name: productName,
        product_image: productImage,
        variant_info: variantInfo,
        quantity: quantity,
        unit_price: product.price,
        total_price: subtotal,
      });

      await supabase
        .from('customers')
        .update({
          total_spent: customerData.total_spent + total,
          order_count: customerData.order_count + 1,
          last_activity: new Date().toISOString(),
        })
        .eq('id', customerData.id);

      let storeName: string | null = null;
      let emailSent = false;
      let emailError: string | undefined;

      if (deliveryType === 'pickup' && selectedStore) {
        const store = storeLocations.find(s => s.id === selectedStore);
        if (store) {
          storeName = getLocalizedField(store, 'name');
        }
      }

      if (formData.email) {
        const emailResult = await sendOrderConfirmationEmail({
          to: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          orderNumber: orderNumber,
          orderItems: [{
            product_name: productName,
            product_image: productImage,
            quantity: quantity,
            unit_price: product.price,
            total_price: subtotal,
            variant_info: variantInfo,
          }],
          subtotal,
          deliveryFee,
          total,
          deliveryType: deliveryType,
          deliveryAddress: addressData?.fullAddress || null,
          storeName: storeName,
          language: language as 'uz' | 'ru' | 'en',
        });

        emailSent = emailResult.success;
        emailError = emailResult.error;
      } else {
        emailSent = true;
      }

      setOrderResult({
        id: orderData.id,
        order_number: orderNumber,
        total: total,
        emailSent,
        emailError,
      });

      setStep('success');
    } catch (error) {
      console.error('Order error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewOrderDetails = () => {
    if (orderResult) {
      onClose();
      navigate(`/order-success/${orderResult.id}`);
    }
  };

  const handleContinueShopping = () => {
    onClose();
    navigate('/products');
  };

  const handleGoHome = () => {
    onClose();
    navigate('/');
  };

  const subtotal = product.price * quantity;
  const deliveryFee = deliveryType === 'delivery' ? (deliveryInfo?.price || 0) : 0;
  const total = subtotal + deliveryFee;
  const productImage = product.product_images?.[0]?.image_url
    || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400';

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === 'form' ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden"
            >
              {step === 'form' ? (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-500 to-orange-600">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                      <Package className="w-6 h-6" />
                      {language === 'uz' ? 'Tez buyurtma' : language === 'ru' ? 'Быстрый заказ' : 'Quick Order'}
                    </h2>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto">
                    <div className="p-6 space-y-6">
                      <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                        <img
                          src={productImage}
                          alt={getLocalizedField(product, 'name')}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {getLocalizedField(product, 'name')}
                          </h3>
                          {Object.keys(selectedVariants).length > 0 && (
                            <p className="text-sm text-gray-500">
                              {Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-gray-500">x{quantity}</span>
                            <span className="font-bold text-orange-500">
                              {formatPrice(subtotal)} {t.common.sum}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">{t.checkout.deliveryType}</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setDeliveryType('delivery')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              deliveryType === 'delivery'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Truck className={`w-5 h-5 ${deliveryType === 'delivery' ? 'text-orange-500' : 'text-gray-400'}`} />
                              <span className={`font-medium ${deliveryType === 'delivery' ? 'text-orange-600' : 'text-gray-700'}`}>
                                {t.checkout.delivery}
                              </span>
                              {deliveryType === 'delivery' && <Check className="w-4 h-4 text-orange-500 ml-auto" />}
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryType('pickup')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              deliveryType === 'pickup'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Store className={`w-5 h-5 ${deliveryType === 'pickup' ? 'text-orange-500' : 'text-gray-400'}`} />
                              <span className={`font-medium ${deliveryType === 'pickup' ? 'text-orange-600' : 'text-gray-700'}`}>
                                {t.checkout.pickup}
                              </span>
                              {deliveryType === 'pickup' && <Check className="w-4 h-4 text-orange-500 ml-auto" />}
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.checkout.firstName} *
                          </label>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2.5 rounded-xl border ${errors.firstName ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500`}
                          />
                          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.checkout.lastName} *
                          </label>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2.5 rounded-xl border ${errors.lastName ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500`}
                          />
                          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.checkout.phone} *
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="+998 90 123 45 67"
                            className={`w-full px-4 py-2.5 rounded-xl border ${errors.phone ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500`}
                          />
                          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t.checkout.email} <span className="text-gray-400 font-normal text-xs">({language === 'uz' ? 'ixtiyoriy' : language === 'ru' ? 'необяз.' : 'optional'})</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="example@email.com"
                            className={`w-full px-4 py-2.5 rounded-xl border ${errors.email ? 'border-red-500' : 'border-gray-200'} focus:outline-none focus:border-orange-500`}
                          />
                          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>
                      </div>

                      {deliveryType === 'delivery' ? (
                        <div className="space-y-4">
                          <AddressSelection
                            onAddressChange={handleAddressChange}
                            compact
                          />
                          {errors.address && (
                            <p className="text-red-500 text-sm">{errors.address}</p>
                          )}
                        </div>
                      ) : (
                        !loading && storeLocations.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">{t.checkout.selectStore}</h4>
                            {storeLocations.map((store) => (
                              <button
                                key={store.id}
                                type="button"
                                onClick={() => setSelectedStore(store.id)}
                                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                                  selectedStore === store.id
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 text-sm">
                                      {getLocalizedField(store, 'name')}
                                    </h5>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <MapPin className="w-3 h-3" />
                                      {getLocalizedField(store, 'address')}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {store.working_hours}
                                    </p>
                                    {store.phone && (
                                      <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <PhoneIcon className="w-3 h-3" />
                                        {store.phone}
                                      </p>
                                    )}
                                    {store.maps_url && (
                                      <a
                                        href={store.maps_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 mt-1 text-xs text-orange-500 hover:text-orange-600"
                                      >
                                        {t.checkout.getDirections}
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>
                                  {selectedStore === store.id && (
                                    <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t.checkout.notes}
                        </label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 resize-none"
                        />
                      </div>
                    </div>

                    <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{t.cart.subtotal}:</span>
                          <span className="font-medium">{formatPrice(subtotal)} {t.common.sum}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{t.checkout.deliveryFee}:</span>
                          {deliveryType === 'pickup' ? (
                            <span className="font-medium text-green-600">{t.checkout.free}</span>
                          ) : deliveryInfo?.isFree ? (
                            <span className="font-medium text-green-600">{t.checkout.free}</span>
                          ) : (
                            <span className="font-medium">{formatPrice(deliveryFee)} {t.common.sum}</span>
                          )}
                        </div>
                        {deliveryType === 'delivery' && deliveryInfo && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              {language === 'uz' ? 'Yetkazib berish' : language === 'ru' ? 'Доставка' : 'Delivery'}:
                            </span>
                            <span className="font-medium text-orange-600">{deliveryInfo.etaText}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-gray-900 font-medium">{t.cart.total}:</span>
                          <span className="text-2xl font-bold text-orange-500">
                            {formatPrice(total)} {t.common.sum}
                          </span>
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
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t.common.loading}
                          </>
                        ) : (
                          <>
                            {t.checkout.placeOrder}
                            <ChevronRight className="w-5 h-5" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="p-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                      className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.4, type: 'spring' }}
                      >
                        <CheckCircle className="w-14 h-14 text-green-500" />
                      </motion.div>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-2xl font-bold text-gray-900 mb-2"
                    >
                      {language === 'uz' && 'Buyurtmangiz qabul qilindi!'}
                      {language === 'ru' && 'Ваш заказ принят!'}
                      {language === 'en' && 'Your order has been placed!'}
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="text-gray-600 mb-4"
                    >
                      {language === 'uz' && 'Bizni tanlaganingiz uchun katta rahmat!'}
                      {language === 'ru' && 'Большое спасибо, что выбрали нас!'}
                      {language === 'en' && 'Thank you very much for choosing us!'}
                    </motion.p>

                    {orderResult?.emailSent && formData.email ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                        className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg px-4 py-2 mb-6"
                      >
                        <Mail className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {language === 'uz' && 'Hisob-faktura emailingizga yuborildi'}
                          {language === 'ru' && 'Счет-фактура отправлена на вашу почту'}
                          {language === 'en' && 'Invoice has been sent to your email'}
                        </span>
                      </motion.div>
                    ) : formData.email && !orderResult?.emailSent ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                        className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-4 py-2 mb-6"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {language === 'uz' && "Buyurtma qabul qilindi, lekin email yuborilmadi. Biz siz bilan bog'lanamiz."}
                          {language === 'ru' && 'Заказ принят, но email не доставлен. Мы свяжемся с вами.'}
                          {language === 'en' && 'Order placed, but email delivery failed. Our team will contact you.'}
                        </span>
                      </motion.div>
                    ) : null}

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="bg-gray-50 rounded-xl p-4 mb-6"
                    >
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <span className="text-gray-500 text-sm">{t.orderSuccess.orderNumber}</span>
                        <span className="font-bold text-orange-500 text-lg">{orderResult?.order_number}</span>
                      </div>

                      <div className="flex gap-3 mb-3">
                        <img
                          src={productImage}
                          alt={getLocalizedField(product, 'name')}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {getLocalizedField(product, 'name')}
                          </p>
                          <p className="text-xs text-gray-500">x{quantity}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="font-medium text-gray-900">{t.orderSuccess.total}</span>
                        <span className="text-xl font-bold text-orange-500">
                          {formatPrice(orderResult?.total || 0)} {t.common.sum}
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="space-y-3"
                    >
                      <button
                        onClick={handleViewOrderDetails}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Package className="w-5 h-5" />
                        {language === 'uz' ? "Buyurtma tafsilotlari" : language === 'ru' ? 'Детали заказа' : 'View Order Details'}
                      </button>
                      <div className="flex gap-3">
                        <button
                          onClick={handleGoHome}
                          className="flex-1 py-3 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Home className="w-4 h-4" />
                          {t.orderSuccess.backToHome}
                        </button>
                        <button
                          onClick={handleContinueShopping}
                          className="flex-1 py-3 border-2 border-orange-500 text-orange-500 hover:bg-orange-50 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          {t.orderSuccess.continueShopping}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
