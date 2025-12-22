import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Mail, Home, ShoppingBag, Printer } from 'lucide-react';
import { Order } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { formatPrice, formatDateTime } from '../utils/format';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function OrderSuccess() {
  const { id } = useParams();
  const { t, language, getLocalizedField } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, customer:customers(*), order_items(*), store_location:store_locations(*)')
      .eq('id', id)
      .maybeSingle();

    if (data) {
      setOrder(data as Order);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-500 text-lg mb-4">{t.common.orderNotFound}</p>
        <Link to="/" className="text-orange-500 hover:text-orange-600 font-medium">
          {t.common.goToHome}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 10 }}
            className="w-32 h-32 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
            >
              <CheckCircle className="w-20 h-20 text-green-500" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            {language === 'uz' && 'Buyurtmangiz muvaffaqiyatli qabul qilindi!'}
            {language === 'ru' && 'Ваш заказ успешно принят!'}
            {language === 'en' && 'Your order has been successfully placed!'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-xl text-gray-600 mb-2"
          >
            {language === 'uz' && 'Tanlovingiz uchun katta rahmat!'}
            {language === 'ru' && 'Спасибо за ваш выбор!'}
            {language === 'en' && 'Thank you for your choice!'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-2 text-orange-500"
          >
            <Mail className="w-5 h-5" />
            <span>{t.orderSuccess.invoiceSent}</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">{t.orderSuccess.orderNumber}</p>
              <p className="text-white text-2xl font-bold">{order.order_number}</p>
            </div>
            <Package className="w-12 h-12 text-white/30" />
          </div>

          <div className="p-6">
            <div className="grid sm:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {t.common.customer}
                </p>
                <p className="font-semibold text-gray-900">
                  {order.customer?.first_name} {order.customer?.last_name}
                </p>
                <p className="text-gray-600">{order.customer?.phone}</p>
                {order.customer?.email && (
                  <p className="text-gray-600">{order.customer?.email}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {order.delivery_type === 'delivery' ? t.checkout.delivery : t.checkout.pickup}
                </p>
                {order.delivery_type === 'delivery' ? (
                  <p className="font-semibold text-gray-900">{order.delivery_address}</p>
                ) : (
                  order.store_location && (
                    <p className="font-semibold text-gray-900">
                      {getLocalizedField(order.store_location, 'name')}
                    </p>
                  )
                )}
                <p className="text-sm text-gray-500 mt-2">
                  {formatDateTime(order.created_at, language)}
                </p>
                <div className="mt-3 px-3 py-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">
                    {language === 'uz' && (order.delivery_type === 'delivery'
                      ? (order.delivery_address?.toLowerCase().includes('buxoro')
                        ? 'Taxminiy yetkazib berish: 24 soat ichida'
                        : 'Taxminiy yetkazib berish: 48-72 soat ichida')
                      : "Do'konda tayyor: 2-4 soat ichida")}
                    {language === 'ru' && (order.delivery_type === 'delivery'
                      ? (order.delivery_address?.toLowerCase().includes('бухар')
                        ? 'Ориентировочная доставка: в течение 24 часов'
                        : 'Ориентировочная доставка: 48-72 часа')
                      : 'Готовность в магазине: 2-4 часа')}
                    {language === 'en' && (order.delivery_type === 'delivery'
                      ? (order.delivery_address?.toLowerCase().includes('bukhara')
                        ? 'Estimated delivery: within 24 hours'
                        : 'Estimated delivery: 48-72 hours')
                      : 'Ready at store: 2-4 hours')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">{t.orderSuccess.orderDetails}</h3>
              <div className="space-y-4">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      {item.variant_info && (
                        <p className="text-sm text-gray-500">{item.variant_info}</p>
                      )}
                      <p className="text-sm text-gray-500">x{item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.total_price)} {t.common.sum}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t.cart.subtotal}</span>
                <span className="font-medium">{formatPrice(order.subtotal)} {t.common.sum}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t.checkout.deliveryFee}</span>
                <span className="font-medium text-green-600">{t.checkout.free}</span>
              </div>
              {order.gift_wrapping && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t.checkout.giftWrapping}</span>
                  <span className="font-medium text-orange-500">{t.common.included}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-100">
                <span className="text-gray-900">{t.orderSuccess.total}</span>
                <span className="text-orange-500">{formatPrice(order.total)} {t.common.sum}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-center">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span className="font-medium">{t.common.printInvoice}</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row gap-4 mt-8 justify-center"
        >
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-colors"
            >
              <Home className="w-5 h-5" />
              {t.orderSuccess.backToHome}
            </motion.button>
          </Link>
          <Link to="/products">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto px-8 py-4 border-2 border-orange-500 text-orange-500 hover:bg-orange-50 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {t.orderSuccess.continueShopping}
            </motion.button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-500 text-sm">
            ORZUTECH - {language === 'uz' ? "O'zbekistonning yetakchi elektronika do'koni" : language === 'ru' ? 'Ведущий магазин электроники Узбекистана' : "Uzbekistan's leading electronics store"}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
