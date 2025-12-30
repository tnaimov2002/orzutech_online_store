import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../utils/format';

interface Product {
  id: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  price: number;
  stock_quantity: number;
  product_images: { image_url: string; is_primary: boolean }[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_SEARCHES_KEY = 'orzutech_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { language, getLocalizedField } = useLanguage();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const searchProducts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchTerm = `%${searchQuery.trim()}%`;

    const { data } = await supabase
      .from('products')
      .select(`
        id, name_uz, name_ru, name_en, price, stock_quantity, stock,
        product_images (image_url, is_primary)
      `)
      .gt('stock', 0)
      .or(`name_uz.ilike.${searchTerm},name_ru.ilike.${searchTerm},name_en.ilike.${searchTerm},brand.ilike.${searchTerm}`)
      .limit(8);

    setResults(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchProducts(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, searchProducts]);

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, MAX_RECENT_SEARCHES);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const handleProductClick = (productId: string) => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
    navigate(`/product/${productId}`);
    onClose();
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    searchProducts(term);
  };

  const getProductImage = (product: Product) => {
    const primaryImage = product.product_images?.find(img => img.is_primary);
    return primaryImage?.image_url || product.product_images?.[0]?.image_url || '';
  };

  const placeholders = {
    uz: "Mahsulot nomi, brend yoki modelni yozing...",
    ru: "Введите название, бренд или модель...",
    en: "Type product name, brand or model..."
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-[101] pt-4 px-4 sm:pt-20"
          >
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
              <form onSubmit={handleSearch} className="relative">
                <div className="flex items-center border-b border-gray-100">
                  <Search className="w-6 h-6 text-gray-400 ml-5" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholders[language]}
                    className="flex-1 px-4 py-5 text-lg bg-transparent focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="p-2 mr-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-3 mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <span className="text-xs font-medium">ESC</span>
                  </button>
                </div>
              </form>

              <div className="max-h-[60vh] overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="p-2">
                    <p className="px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {language === 'uz' ? 'Natijalar' : language === 'ru' ? 'Результаты' : 'Results'}
                    </p>
                    {results.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                      >
                        <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {getProductImage(product) ? (
                            <img
                              src={getProductImage(product)}
                              alt={getLocalizedField(product, 'name')}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Search className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-orange-500 transition-colors">
                            {getLocalizedField(product, 'name')}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-orange-500 font-semibold">
                              {formatPrice(product.price)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              product.stock_quantity > 0
                                ? 'bg-green-100 text-green-600'
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {product.stock_quantity > 0
                                ? (language === 'uz' ? 'Mavjud' : language === 'ru' ? 'В наличии' : 'In Stock')
                                : (language === 'uz' ? 'Tugagan' : language === 'ru' ? 'Нет' : 'Out of Stock')}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
                      </button>
                    ))}

                    {query.trim() && (
                      <button
                        onClick={handleSearch}
                        className="w-full flex items-center justify-center gap-2 p-4 text-orange-500 font-medium hover:bg-orange-50 rounded-xl transition-colors"
                      >
                        <TrendingUp className="w-5 h-5" />
                        {language === 'uz' ? `"${query}" bo'yicha barcha natijalar` :
                         language === 'ru' ? `Все результаты по "${query}"` :
                         `All results for "${query}"`}
                      </button>
                    )}
                  </div>
                )}

                {!loading && !query && recentSearches.length > 0 && (
                  <div className="p-2">
                    <p className="px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {language === 'uz' ? 'So\'nggi qidiruvlar' : language === 'ru' ? 'Недавние поиски' : 'Recent Searches'}
                    </p>
                    {recentSearches.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentClick(term)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{term}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!loading && query && results.length === 0 && (
                  <div className="py-12 text-center">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {language === 'uz' ? 'Hech narsa topilmadi' :
                       language === 'ru' ? 'Ничего не найдено' :
                       'No results found'}
                    </p>
                  </div>
                )}

                {!loading && !query && recentSearches.length === 0 && (
                  <div className="py-12 text-center">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {language === 'uz' ? 'Qidiruv so\'zini kiriting' :
                       language === 'ru' ? 'Введите поисковый запрос' :
                       'Enter a search term'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
