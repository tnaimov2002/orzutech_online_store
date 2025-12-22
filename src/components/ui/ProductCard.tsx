import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Zap, TrendingUp, Percent } from 'lucide-react';
import { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { formatPrice, calculateDiscount } from '../../utils/format';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { t, getLocalizedField } = useLanguage();
  const { addToCart } = useCart();

  const primaryImage = product.product_images?.find((img) => img.is_primary)?.image_url
    || product.product_images?.[0]?.image_url
    || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400';

  const discount = product.original_price
    ? calculateDiscount(product.original_price, product.price)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group"
    >
      <Link to={`/product/${product.id}`}>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="relative aspect-square overflow-hidden bg-gray-50">
            <motion.img
              src={primaryImage}
              alt={getLocalizedField(product, 'name')}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />

            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.is_new && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-lg">
                  <Zap className="w-3 h-3" />
                  {t.product.new}
                </span>
              )}
              {product.is_popular && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-black text-white text-xs font-medium rounded-lg">
                  <TrendingUp className="w-3 h-3" />
                  {t.product.popular}
                </span>
              )}
              {discount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg">
                  <Percent className="w-3 h-3" />
                  -{discount}%
                </span>
              )}
            </div>

            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Heart className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                className="w-full py-2.5 bg-white text-black rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                {t.product.addToCart}
              </motion.button>
            </div>
          </div>

          <div className="p-4">
            {product.brand && (
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                {product.brand}
              </p>
            )}
            <h3 className="font-semibold text-gray-800 group-hover:text-orange-500 transition-colors line-clamp-2 min-h-[48px]">
              {getLocalizedField(product, 'name')}
            </h3>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.rating)
                        ? 'text-orange-400 fill-orange-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">
                ({product.review_count})
              </span>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {formatPrice(product.price)} <span className="text-sm font-normal text-gray-500">{t.common.sum}</span>
                </p>
                {product.original_price && (
                  <p className="text-sm text-gray-400 line-through">
                    {formatPrice(product.original_price)} {t.common.sum}
                  </p>
                )}
              </div>
              {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                <span className="text-xs text-orange-500 font-medium">
                  {product.stock_quantity} {t.product.left}
                </span>
              )}
              {product.stock_quantity === 0 && (
                <span className="text-xs text-red-500 font-medium">
                  {t.product.outOfStock}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
