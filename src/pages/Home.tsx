import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Truck, Shield, Headphones, CreditCard } from 'lucide-react';
import { Product, Category } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { getSemanticIcon } from '../utils/categoryIcons';
import BannerSlider from '../components/ui/BannerSlider';
import ProductCard from '../components/ui/ProductCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const FEATURED_CATEGORY_NAMES = [
  'Noutbuklar',
  'Smartfonlar',
  'Maishiy texnika',
  'Planshetlar',
  "O'yinlar",
  'Televizorlar',
  'Havo tozalagichlar',
  'Tayyor kompyuterlar',
];

export default function Home() {
  const { t, getLocalizedField } = useLanguage();
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [discountProducts, setDiscountProducts] = useState<Product[]>([]);
  const [featuredCategories, setFeaturedCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const productsChannel = supabase
      .channel('home-products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('home-categories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const rawTest = await supabase.from('products').select('id, name_uz, stock, stock_quantity').limit(5);
    console.log('[HOME] RAW PRODUCTS TEST:', { data: rawTest.data, error: rawTest.error, count: rawTest.data?.length });

    const rawCatTest = await supabase.from('categories').select('id, name_uz, status').limit(5);
    console.log('[HOME] RAW CATEGORIES TEST:', { data: rawCatTest.data, error: rawCatTest.error, count: rawCatTest.data?.length });

    const [newRes, popularRes, discountRes, categoriesRes, allProductsRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, product_images(*), category:categories(*)')
        .eq('is_new', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('products')
        .select('*, product_images(*), category:categories(*)')
        .eq('is_popular', true)
        .gt('stock', 0)
        .order('rating', { ascending: false })
        .limit(8),
      supabase
        .from('products')
        .select('*, product_images(*), category:categories(*)')
        .eq('is_discount', true)
        .gt('stock', 0)
        .not('original_price', 'is', null)
        .limit(8),
      supabase
        .from('categories')
        .select('*')
        .eq('status', 'active')
        .in('name_uz', FEATURED_CATEGORY_NAMES),
      supabase
        .from('products')
        .select('*, product_images(*), category:categories(*)')
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    console.log('[HOME] Data fetch results:', {
      newProducts: newRes.data?.length || 0,
      newError: newRes.error?.message,
      popularProducts: popularRes.data?.length || 0,
      popularError: popularRes.error?.message,
      discountProducts: discountRes.data?.length || 0,
      discountError: discountRes.error?.message,
      categories: categoriesRes.data?.length || 0,
      categoriesError: categoriesRes.error?.message,
      allProducts: allProductsRes.data?.length || 0,
      allError: allProductsRes.error?.message,
    });

    if (allProductsRes.data) {
      setAllProducts(allProductsRes.data);
      console.log('[HOME] Setting allProducts state:', allProductsRes.data.length);
    }

    if (newRes.data && newRes.data.length > 0) {
      setNewProducts(newRes.data);
      console.log('[HOME] Setting newProducts state:', newRes.data.length);
    } else if (allProductsRes.data && allProductsRes.data.length > 0) {
      setNewProducts(allProductsRes.data.slice(0, 8));
      console.log('[HOME] Setting newProducts from allProducts:', allProductsRes.data.slice(0, 8).length);
    }

    if (popularRes.data && popularRes.data.length > 0) {
      setPopularProducts(popularRes.data);
      console.log('[HOME] Setting popularProducts state:', popularRes.data.length);
    } else if (allProductsRes.data && allProductsRes.data.length > 0) {
      setPopularProducts(allProductsRes.data.slice(0, 8));
      console.log('[HOME] Setting popularProducts from allProducts:', allProductsRes.data.slice(0, 8).length);
    }

    if (discountRes.data && discountRes.data.length > 0) {
      setDiscountProducts(discountRes.data);
      console.log('[HOME] Setting discountProducts state:', discountRes.data.length);
    }

    if (categoriesRes.data) {
      const orderedCategories = FEATURED_CATEGORY_NAMES
        .map(name => categoriesRes.data.find(cat => cat.name_uz === name))
        .filter((cat): cat is Category => cat !== undefined);
      setFeaturedCategories(orderedCategories);
      console.log('[HOME] Setting featuredCategories state:', orderedCategories.length);
    }

    setLoading(false);
  };

  const renderCategoryIcon = (category: Category) => {
    const categoryName = `${category.name_en} ${category.name_uz} ${category.name_ru}`;
    const IconComponent = getSemanticIcon(category.icon, categoryName);
    return <IconComponent className="w-7 h-7 text-orange-500" />;
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
      {/* DEBUG: Force render all products - proves data binding works */}
      <section className="py-8 px-4 bg-green-50 border-4 border-green-500">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 p-4 bg-white rounded-lg">
            <p className="font-bold text-green-700">FORCE RENDER TEST (allProducts: {allProducts.length})</p>
            {allProducts[0] && (
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify({ id: allProducts[0].id, name: allProducts[0].name_uz, stock: allProducts[0].stock }, null, 2)}
              </pre>
            )}
          </div>
          {allProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allProducts.slice(0, 8).map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <p className="text-red-600 font-bold">NO PRODUCTS IN STATE - DATA BINDING FAILED</p>
          )}
        </div>
      </section>

      <section className="pb-8 px-4">
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

      {featuredCategories.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-orange-500 rounded-full" />
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {t.nav.categories}
                </h2>
              </div>
              <Link
                to="/products"
                className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                {t.home.viewAll}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4">
              {featuredCategories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Link
                    to={`/products?category=${category.id}`}
                    className="block group"
                  >
                    <div className="relative bg-white border border-gray-100 rounded-2xl p-4 md:p-5 flex flex-col items-center gap-3 overflow-hidden transition-all duration-300 group-hover:border-orange-200 group-hover:shadow-xl group-hover:shadow-orange-500/10 group-hover:-translate-y-1">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                        {renderCategoryIcon(category)}
                      </div>
                      <h3 className="relative text-sm font-semibold text-gray-700 text-center leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">
                        {getLocalizedField(category, 'name')}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

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
