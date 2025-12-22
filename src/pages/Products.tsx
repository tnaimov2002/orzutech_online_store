import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { Product, Category } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ui/ProductCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatPrice } from '../utils/format';

type SortOption = 'newest' | 'priceAsc' | 'priceDesc' | 'popular';

export default function Products() {
  const { t, getLocalizedField } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const categoryFromUrl = searchParams.get('category');
  const isNew = searchParams.get('new') === 'true';
  const isPopular = searchParams.get('popular') === 'true';
  const isDiscount = searchParams.get('discount') === 'true';

  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFromUrl);

  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedBrands, priceRange, sortBy, isNew, isPopular, isDiscount, categories]);

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
      setBrands(uniqueBrands);
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
      .select('*, product_images(*)')
      .gte('price', priceRange[0])
      .lte('price', priceRange[1]);

    if (selectedCategory && categories.length > 0) {
      const categoryIds = getAllDescendantCategoryIds(selectedCategory, categories);
      query = query.in('category_id', categoryIds);
    }

    if (selectedBrands.length > 0) {
      query = query.in('brand', selectedBrands);
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

    const { data } = await query;
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      searchParams.set('category', categoryId);
    } else {
      searchParams.delete('category');
    }
    setSearchParams(searchParams);
  };

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedBrands([]);
    setPriceRange([0, 50000000]);
    searchParams.delete('category');
    searchParams.delete('new');
    searchParams.delete('popular');
    searchParams.delete('discount');
    setSearchParams(searchParams);
  };

  const parentCategories = categories.filter((c) => !c.parent_id);

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">{t.nav.categories}</h3>
        <div className="space-y-2">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              !selectedCategory
                ? 'bg-orange-100 text-orange-600'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {t.home.viewAll}
          </button>
          {parentCategories.map((category) => {
            const children = categories.filter((c) => c.parent_id === category.id);
            return (
              <div key={category.id}>
                <button
                  onClick={() => handleCategoryChange(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-orange-100 text-orange-600'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {getLocalizedField(category, 'name')}
                </button>
                {children.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleCategoryChange(child.id)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          selectedCategory === child.id
                            ? 'bg-orange-100 text-orange-600'
                            : 'hover:bg-gray-100 text-gray-500'
                        }`}
                      >
                        {getLocalizedField(child, 'name')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-4">{t.product.priceRange}</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
              placeholder="Min"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
              placeholder="Max"
            />
          </div>
          <input
            type="range"
            min={0}
            max={50000000}
            step={100000}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>{formatPrice(priceRange[0])}</span>
            <span>{formatPrice(priceRange[1])}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-4">{t.product.brands}</h3>
        <div className="space-y-2">
          {brands.map((brand) => (
            <label
              key={brand}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand)}
                onChange={() => handleBrandToggle(brand)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-gray-600 group-hover:text-gray-900 transition-colors">
                {brand}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={clearFilters}
        className="w-full py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium"
      >
        {t.product.clearFilters}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {t.nav.products}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:border-orange-500"
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
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-lg text-gray-700 font-medium"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t.product.filters}
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24 z-10">
              <FilterSidebar />
            </div>
          </aside>

          <main className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">{t.product.noProducts}</p>
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
              className="fixed left-0 top-0 bottom-0 w-80 bg-white z-40 lg:hidden overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{t.product.filters}</h2>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <FilterSidebar />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
