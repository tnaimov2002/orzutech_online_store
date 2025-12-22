import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Truck, Shield, Headphones, CreditCard } from 'lucide-react';
import { Product, Category } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import BannerSlider from '../components/ui/BannerSlider';
import ProductCard from '../components/ui/ProductCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Home() {
  const { t, getLocalizedField } = useLanguage();
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [discountProducts, setDiscountProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [newRes, popularRes, discountRes, categoriesRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('is_new', true)
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('is_popular', true)
        .order('rating', { ascending: false })
        .limit(4),
      supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('is_discount', true)
        .not('original_price', 'is', null)
        .limit(4),
      supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('sort_order')
        .limit(5),
    ]);

    if (newRes.data) setNewProducts(newRes.data);
    if (popularRes.data) setPopularProducts(popularRes.data);
    if (discountRes.data) setDiscountProducts(discountRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);

    setLoading(false);
  };

  const features = [
    {
      icon: Truck,
      title: { uz: 'Bepul yetkazib berish', ru: 'Бесплатная доставка', en: 'Free Delivery' },
      desc: { uz: 'Buxoro shahrida', ru: 'По городу Бухара', en: 'Within Bukhara city' },
    },
    {
      icon: Shield,
      title: { uz: 'Kafolat', ru: 'Гарантия', en: 'Warranty' },
      desc: { uz: '12 oy rasmiy kafolat', ru: '12 месяцев гарантии', en: '12 months warranty' },
    },
    {
      icon: Headphones,
      title: { uz: "24/7 qo'llab-quvvatlash", ru: 'Поддержка 24/7', en: '24/7 Support' },
      desc: { uz: 'Har doim aloqada', ru: 'Всегда на связи', en: 'Always available' },
    },
    {
      icon: CreditCard,
      title: { uz: "Bo'lib to'lash", ru: 'Рассрочка', en: 'Installments' },
      desc: { uz: '12 oygacha', ru: 'До 12 месяцев', en: 'Up to 12 months' },
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <BannerSlider />
        </div>
      </section>

      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm md:text-base">
                    {feature.title[useLanguage().language]}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500">
                    {feature.desc[useLanguage().language]}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t.nav.categories}
            </h2>
            <Link
              to="/products"
              className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              {t.home.viewAll}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/products?category=${category.id}`}
                  className="block group"
                >
                  <div className="aspect-square bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 group-hover:shadow-lg group-hover:shadow-orange-500/10 transition-all duration-300">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-3xl">
                        {category.name_en === 'Smartphones' && '📱'}
                        {category.name_en === 'Laptops' && '💻'}
                        {category.name_en === 'Tablets' && '📲'}
                        {category.name_en === 'Accessories' && '🎧'}
                        {category.name_en === 'Home Appliances' && '🏠'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 text-center group-hover:text-orange-500 transition-colors">
                      {getLocalizedField(category, 'name')}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {newProducts.length > 0 && (
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-orange-500 rounded-full" />
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {t.home.newProducts}
                </h2>
              </div>
              <Link
                to="/products?new=true"
                className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                {t.home.viewAll}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {newProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {popularProducts.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-black rounded-full" />
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {t.home.popularProducts}
                </h2>
              </div>
              <Link
                to="/products?popular=true"
                className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                {t.home.viewAll}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {popularProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {discountProducts.length > 0 && (
        <section className="py-12 px-4 bg-gradient-to-r from-orange-500 to-orange-600">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-white rounded-full" />
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  {t.home.discountProducts}
                </h2>
              </div>
              <Link
                to="/products?discount=true"
                className="flex items-center gap-2 text-white hover:text-white/80 font-medium transition-colors"
              >
                {t.home.viewAll}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {discountProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
