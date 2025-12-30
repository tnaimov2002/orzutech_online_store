import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Heart,
  Star,
  Check,
  Truck,
  Shield,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Send
} from 'lucide-react';
import { Product, Review, ProductVariant } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { formatPrice, formatDate } from '../utils/format';
import ProductCard from '../components/ui/ProductCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import DirectCheckoutModal from '../components/ui/DirectCheckoutModal';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language, getLocalizedField } = useLanguage();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

  const [reviewForm, setReviewForm] = useState({
    name: '',
    rating: 5,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);

    const { data: productData } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*)')
      .eq('id', id)
      .maybeSingle();

    if (productData) {
      setProduct(productData);

      const variantTypes = [...new Set(productData.product_variants?.map((v: ProductVariant) => v.variant_type) || [])];
      const initialVariants: Record<string, string> = {};
      variantTypes.forEach((type) => {
        const firstVariant = productData.product_variants?.find((v: ProductVariant) => v.variant_type === type);
        if (firstVariant) {
          initialVariants[type] = firstVariant.variant_value;
        }
      });
      setSelectedVariants(initialVariants);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (reviewsData) setReviews(reviewsData);

      if (productData.category_id) {
        const { data: relatedData } = await supabase
          .from('products')
          .select('*, product_images(*), category:categories(*)')
          .eq('category_id', productData.category_id)
          .neq('id', id)
          .gt('stock', 0)
          .limit(4);

        if (relatedData) setRelatedProducts(relatedData);
      }
    }

    setLoading(false);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity, selectedVariants);
    }
  };

  const handleBuyNow = () => {
    if (product) {
      setShowCheckoutModal(true);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !reviewForm.name || !reviewForm.comment) return;

    setSubmitting(true);

    await supabase.from('reviews').insert({
      product_id: product.id,
      customer_name: reviewForm.name,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      is_approved: false,
    });

    setReviewForm({ name: '', rating: 5, comment: '' });
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-500 text-lg mb-4">{t.common.productNotFound}</p>
        <button
          onClick={() => navigate('/products')}
          className="text-orange-500 hover:text-orange-600 font-medium"
        >
          {t.common.backToProducts}
        </button>
      </div>
    );
  }

  const images = product.product_images || [];
  const currentImage = images[currentImageIndex]?.image_url
    || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=800';

  const variantTypes = [...new Set(product.product_variants?.map((v) => v.variant_type) || [])];

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-500 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.common.back}
        </button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={currentImage}
                  alt={getLocalizedField(product, 'name')}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.is_new && (
                  <span className="px-3 py-1 bg-orange-500 text-white text-sm font-medium rounded-lg">
                    {t.product.new}
                  </span>
                )}
                {product.is_popular && (
                  <span className="px-3 py-1 bg-black text-white text-sm font-medium rounded-lg">
                    {t.product.popular}
                  </span>
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex
                        ? 'border-orange-500'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {product.brand && (
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                {product.brand}
              </p>
            )}

            <h1 className="text-3xl font-bold text-gray-900">
              {getLocalizedField(product, 'name')}
            </h1>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.rating)
                        ? 'text-orange-400 fill-orange-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-500">
                {product.rating} ({product.review_count} {t.product.reviews})
              </span>
            </div>

            <div className="flex items-end gap-4">
              <p className="text-4xl font-bold text-gray-900">
                {formatPrice(product.price)} <span className="text-lg font-normal text-gray-500">{t.common.sum}</span>
              </p>
              {product.original_price && (
                <p className="text-xl text-gray-400 line-through">
                  {formatPrice(product.original_price)} {t.common.sum}
                </p>
              )}
            </div>

            <div className={`flex items-center gap-2 ${(product.stock || product.stock_quantity) > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {(product.stock || product.stock_quantity) > 0 ? (
                <>
                  <Check className="w-5 h-5" />
                  <span className="font-medium">{t.product.inStock}</span>
                  <span className="text-gray-500">({product.stock || product.stock_quantity} {t.product.left})</span>
                </>
              ) : (
                <span className="font-medium">{t.product.outOfStock}</span>
              )}
            </div>

            {variantTypes.map((type) => {
              const variants = product.product_variants?.filter((v) => v.variant_type === type) || [];
              return (
                <div key={type} className="space-y-2">
                  <p className="font-medium text-gray-700 capitalize">{type}</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariants((prev) => ({ ...prev, [type]: variant.variant_value }))}
                        className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                          selectedVariants[type] === variant.variant_value
                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {variant.variant_value}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="space-y-2">
              <p className="font-medium text-gray-700">{t.cart.quantity}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  -
                </button>
                <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock || product.stock_quantity, quantity + 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBuyNow}
                disabled={(product.stock || product.stock_quantity) === 0}
                className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl font-semibold text-lg shadow-lg shadow-orange-500/30 transition-colors"
              >
                {t.product.buyNow}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                disabled={(product.stock || product.stock_quantity) === 0}
                className="flex-1 py-4 border-2 border-orange-500 text-orange-500 hover:bg-orange-50 disabled:border-gray-300 disabled:text-gray-400 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {t.product.addToCart}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 rounded-xl flex items-center justify-center transition-colors group"
              >
                <Heart className="w-6 h-6 text-gray-400 group-hover:text-red-500" />
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{t.checkout.freeDelivery}</p>
                  <p className="text-xs text-gray-500">{t.checkout.bukharaDelivery}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{t.product.warranty}</p>
                  <p className="text-xs text-gray-500">{getLocalizedField(product, 'warranty')}</p>
                </div>
              </div>
            </div>

            {product.sku && (
              <p className="text-sm text-gray-500">
                {t.product.sku}: <span className="font-medium">{product.sku}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-12">
          <div className="flex gap-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-4 font-semibold transition-colors relative ${
                activeTab === 'description' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.product.description}
              {activeTab === 'description' && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 font-semibold transition-colors relative ${
                activeTab === 'reviews' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.product.reviews} ({reviews.length})
              {activeTab === 'reviews' && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                />
              )}
            </button>
          </div>

          <div className="py-8">
            {activeTab === 'description' ? (
              <div className="prose max-w-none text-gray-600">
                <p className="whitespace-pre-line">{getLocalizedField(product, 'description')}</p>
              </div>
            ) : (
              <div className="space-y-8">
                <form onSubmit={handleSubmitReview} className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">{t.product.writeReview}</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={reviewForm.name}
                      onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                      placeholder={t.checkout.firstName}
                      className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                      required
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{t.product.rating}:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= reviewForm.rating
                                ? 'text-orange-400 fill-orange-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder={t.product.writeReview}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 resize-none"
                    required
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? t.common.loading : t.product.writeReview}
                  </motion.button>
                </form>

                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t.common.noReviewsYet}</p>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="bg-white border border-gray-100 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <span className="font-semibold text-orange-600">
                                {review.customer_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{review.customer_name}</p>
                              <p className="text-sm text-gray-500">{formatDate(review.created_at, language)}</p>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'text-orange-400 fill-orange-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600">{review.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {t.product.youMayAlsoLike}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((prod, index) => (
                <ProductCard key={prod.id} product={prod} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>

      {product && (
        <DirectCheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          product={product}
          quantity={quantity}
          selectedVariants={selectedVariants}
        />
      )}
    </div>
  );
}
