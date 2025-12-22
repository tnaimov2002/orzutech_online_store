import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, ShoppingBag, Calendar } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { formatPrice, formatDate } from '../utils/format';

export default function Cart() {
  const { t, language, getLocalizedField } = useLanguage();
  const { items, removeFromCart, updateQuantity, clearCart, getTotal } = useCart();
  const navigate = useNavigate();

  const total = getTotal();

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-4"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-32 h-32 mx-auto mb-8 bg-orange-100 rounded-full flex items-center justify-center"
          >
            <ShoppingBag className="w-16 h-16 text-orange-500" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.cart.empty}</h2>
          <p className="text-gray-500 mb-8">{t.common.startShopping}</p>
          <Link to="/products">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {t.cart.continueShopping}
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-orange-500" />
            {t.cart.title}
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearCart}
            className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t.cart.clearCart}
          </motion.button>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item, index) => {
                const primaryImage = item.product.product_images?.find((img) => img.is_primary)?.image_url
                  || item.product.product_images?.[0]?.image_url
                  || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400';

                return (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex flex-col sm:flex-row gap-6">
                      <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="w-full sm:w-32 h-32 rounded-xl overflow-hidden bg-gray-50"
                        >
                          <img
                            src={primaryImage}
                            alt={getLocalizedField(item.product, 'name')}
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {item.product.brand && (
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                                {item.product.brand}
                              </p>
                            )}
                            <Link to={`/product/${item.product.id}`}>
                              <h3 className="font-semibold text-gray-900 hover:text-orange-500 transition-colors line-clamp-2">
                                {getLocalizedField(item.product, 'name')}
                              </h3>
                            </Link>
                            {Object.entries(item.selectedVariants).length > 0 && (
                              <p className="text-sm text-gray-500 mt-1">
                                {Object.entries(item.selectedVariants).map(([key, value]) => (
                                  <span key={key} className="mr-3">
                                    <span className="capitalize">{key}:</span> {value}
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </motion.button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                          <div>
                            <p className="text-2xl font-bold text-gray-900">
                              {formatPrice(item.product.price)} <span className="text-sm font-normal text-gray-500">{t.common.sum}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>{t.cart.addedOn}: {formatDate(item.addedAt, language)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </motion.button>
                            <span className="w-12 text-center font-semibold text-lg">
                              {item.quantity}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-gray-500">{t.cart.subtotal}:</span>
                          <span className="text-xl font-bold text-orange-500">
                            {formatPrice(item.product.price * item.quantity)} {t.common.sum}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t.cart.orderSummary}</h2>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate max-w-[180px]">
                      {getLocalizedField(item.product, 'name')} x{item.quantity}
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">{t.cart.total}:</span>
                  <span className="text-orange-500">{formatPrice(total)} {t.common.sum}</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/checkout')}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-colors"
              >
                {t.cart.checkout}
                <ArrowRight className="w-5 h-5" />
              </motion.button>

              <Link to="/products">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-3 py-4 border-2 border-gray-200 text-gray-700 hover:border-gray-300 rounded-xl font-semibold transition-colors"
                >
                  {t.cart.continueShopping}
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
