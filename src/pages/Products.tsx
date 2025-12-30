import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Check, RotateCcw } from 'lucide-react';
import { Product, Category } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ui/ProductCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatPrice } from '../utils/format';

type SortOption = 'newest' | 'priceAsc' | 'priceDesc' | 'popular';

const DEFAULT_PRICE_RANGE: [number, number] = [0, 50000000];

export default function Products() {
  const { t, getLocalizedField } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [appliedBrands, setAppliedBrands] = useState<string[]>([]);
  const [appliedPriceRange, setAppliedPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);

  const [pendingBrands, setPendingBrands] = useState<string[]>([]);
  const [pendingPriceRange, setPendingPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);

  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const categoryFromUrl = searchParams.get('category');
  const isNew = searchParams.get('new') === 'true';
  const isPopular = searchParams.get('popular') === 'true';
  const isDiscount = searchParams.get('discount') === 'true';

  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFromUrl);

  const hasFilterChanges = useMemo(() => {
    const brandsChanged = JSON.stringify(pendingBrands.sort()) !== JSON.stringify(appliedBrands.sort());
    const priceChanged = pendingPriceRange[0] !== appliedPriceRange[0] || pendingPriceRange[1] !== appliedPriceRange[1];
    return brandsChanged || priceChanged;
  }, [pendingBrands, appliedBrands, pendingPriceRange, appliedPriceRange]);

  const hasActiveFilters = useMemo(() => {
    return appliedBrands.length > 0 ||
           appliedPriceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
           appliedPriceRange[1] !== DEFAULT_PRICE_RANGE[1];
  }, [appliedBrands, appliedPriceRange]);

  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    fetchCategories();
    fetchBrands();

    const productsChannel = supabase
      .channel('products-page-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchProducts();
          fetchBrands();
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('categories-page-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, appliedBrands, appliedPriceRange, sortBy, isNew, isPopular, isDiscount, categories]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');
    if (data) setCategories(data);
  };

  const fetchBrands = async () => {
    const { data } = await supabase
      .from('products')
      .select('brand')
      .not('brand', 'is', null);
    if (data) {
      const uniqueBrands = [...new Set(data.map((p) => p.brand).filter(Boolean))] as string[];
      setBrands(uniqueBrands.sort());
    }
  };

  const getAllDescendantCategoryIds = (categoryId: string, allCategories: Category[]): string[] => {
    const ids: string[] = [categoryId];
    const children = allCategories.filter((c) => c.parent_id === categoryId);
    for (const child of children) {
      ids.push(...getAllDescendantCategoryIds(child.id, allCategories));
    }
    return ids;
  };

  const fetchProducts = async () => {
    setLoading(true);

    let query = supabase
      .from('products')
      .select('*, product_images(*), category:categories(*)')
      .gt('stock', 0)
      .gte('price', appliedPriceRange[0])
      .lte('price', appliedPriceRange[1]);

    if (selectedCategory && categories.length > 0) {
      const categoryIds = getAllDescendantCategoryIds(selectedCategory, categories);
      query = query.in('category_id', categoryIds);
    }

    if (appliedBrands.length > 0) {
      query = query.in('brand', appliedBrands);
    }

    if (isNew) {
      query = query.eq('is_new', true);
    }

    if (isPopular) {
      query = query.eq('is_popular', true);
    }

    if (isDiscount) {
      query = query.eq('is_discount', true);
    }

    switch (sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'priceAsc':
        query = query.order('price', { ascending: true });
        break;
      case 'priceDesc':
        query = query.order('price', { ascending: false });
        break;
      case 'popular':
        query = query.order('rating', { ascending: false });
        break;
    }

    const { data, error } = await query;

    console.log('[PRODUCTS] Fetch results:', {
      count: data?.length || 0,
      error: error?.message,
      selectedCategory,
      appliedBrands: appliedBrands.length,
      priceRange: appliedPriceRange,
    });

    if (data) setProducts(data);
    setLoading(false);
  };

  const handleBrandToggle = (brand: string) => {
    setPendingBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleApplyFilters = () => {
    setAppliedBrands([...pendingBrands]);
    setAppliedPriceRange([...pendingPriceRange]);
    setIsSidebarOpen(false);
  };

  const clearFilters = () => {
    setPendingBrands([]);
    setPendingPriceRange(DEFAULT_PRICE_RANGE);
    setAppliedBrands([]);
    setAppliedPriceRange(DEFAULT_PRICE_RANGE);
    searchParams.delete('new');
    searchParams.delete('popular');
    searchParams.delete('discount');
    setSearchParams(searchParams);
  };

  const FilterSidebar = ({ inModal = false }: { inModal?: boolean }) => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          {t.product.priceRange}
        </h3>
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Min</label>
              <input
                type="number"
                value={pendingPriceRange[0]}
                onChange={(e) => setPendingPriceRange([Number(e.target.value), pendingPriceRange[1]])}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                placeholder="0"
              />
            </div>
            <span className="text-gray-400 mt-5">-</span>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Max</label>
              <input
                type="number"
                value={pendingPriceRange[1]}
                onChange={(e) => setPendingPriceRange([pendingPriceRange[0], Number(e.target.value)])}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                placeholder="50,000,000"
              />
            </div>
          </div>
          <div className="px-1">
            <input
              type="range"
              min={0}
              max={50000000}
              step={100000}
              value={pendingPriceRange[1]}
              onChange={(e) => setPendingPriceRange([pendingPriceRange[0], Number(e.target.value)])}
              className="w-full accent-orange-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>{formatPrice(pendingPriceRange[0])}</span>
            <span>{formatPrice(pendingPriceRange[1])}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t.product.brands}</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {brands.map((brand) => {
            const isChecked = pendingBrands.includes(brand);
            return (
              <label
                key={brand}
                className="flex items-center gap-3 cursor-pointer group py-1.5"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleBrandToggle(brand)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all pointer-events-none ${
                  isChecked
                    ? 'bg-orange-500 border-orange-500'
                    : 'border-gray-300 group-hover:border-orange-400'
                }`}>
                  {isChecked && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className={`transition-colors ${
                  isChecked
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-600 group-hover:text-gray-900'
                }`}>
                  {brand}
                </span>
              </label>
            );
          })}
          {brands.length === 0 && (
            <p className="text-sm text-gray-400 italic">{t.product.noProducts}</p>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6 space-y-3">
        <AnimatePresence>
          {hasFilterChanges && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={handleApplyFilters}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98]"
            >
              {t.product.applyFilters}
            </motion.button>
          )}
        </AnimatePresence>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="w-full py-2.5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all font-medium flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t.product.clearFilters}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t.nav.products}
            </h1>
            {(appliedBrands.length > 0 || appliedPriceRange[0] > 0 || appliedPriceRange[1] < 50000000) && (
              <p className="text-sm text-gray-500 mt-1">
                {products.length} {t.product.productsFound}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:border-orange-500 shadow-sm"
              >
                <option value="newest">{t.product.sortOptions.newest}</option>
                <option value="priceAsc">{t.product.sortOptions.priceAsc}</option>
                <option value="priceDesc">{t.product.sortOptions.priceDesc}</option>
                <option value="popular">{t.product.sortOptions.popular}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium shadow-sm hover:bg-gray-50 transition-colors relative"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t.product.filters}
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                {t.product.filters}
              </h2>
              <FilterSidebar />
            </div>
          </aside>

          <main className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-500 text-lg">{t.product.noProducts}</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                  >
                    {t.product.clearFilters}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 lg:hidden overflow-y-auto shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                    {t.product.filters}
                  </h2>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <FilterSidebar inModal />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
