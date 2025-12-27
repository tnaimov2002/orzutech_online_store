import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Globe,
  Phone,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Building2,
  Wrench,
  Mail
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { Language, Category } from '../../types';
import { supabase } from '../../lib/supabase';
import { getSemanticIcon } from '../../utils/categoryIcons';
import SearchModal from '../ui/SearchModal';

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

const languages: { code: Language; name: string }[] = [
  { code: 'uz', name: "O'zbekcha" },
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
];

const topNavLinks = [
  { key: 'about', path: '/about', icon: Building2, label: { uz: 'Biz haqimizda', ru: 'О нас', en: 'About Us' } },
  { key: 'services', path: '/services', icon: Wrench, label: { uz: 'Xizmatlarimiz', ru: 'Услуги', en: 'Services' } },
  { key: 'contact', path: '/contact', icon: Mail, label: { uz: 'Aloqa', ru: 'Контакты', en: 'Contact' } },
];

export default function Header() {
  const { language, setLanguage, t, getLocalizedField } = useLanguage();
  const { getItemCount } = useCart();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [headerCategories, setHeaderCategories] = useState<CategoryTreeNode[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectionPath, setSelectionPath] = useState<CategoryTreeNode[]>([]);
  const [mobileDrilldownStack, setMobileDrilldownStack] = useState<CategoryTreeNode[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const langMenuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setSelectionPath([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const buildCategoryTree = useCallback((flatCategories: Category[]): CategoryTreeNode[] => {
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    flatCategories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    flatCategories.forEach(cat => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        categoryMap.get(cat.parent_id)!.children.push(node);
      } else if (!cat.parent_id && cat.show_in_header) {
        roots.push(node);
      }
    });

    const sortChildren = (node: CategoryTreeNode) => {
      node.children.sort((a, b) => a.sort_order - b.sort_order);
      node.children.forEach(sortChildren);
    };

    roots.sort((a, b) => a.sort_order - b.sort_order);
    roots.forEach(sortChildren);

    return roots;
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('status', 'active')
      .order('level')
      .order('sort_order');

    if (data) {
      const tree = buildCategoryTree(data);
      setHeaderCategories(tree);
    }
  }, [buildCategoryTree]);

  useEffect(() => {
    fetchCategories();

    const channel = supabase
      .channel('header_categories_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCategories]);

  const toggleDropdown = (categoryId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (openDropdown === categoryId) {
      setOpenDropdown(null);
      setSelectionPath([]);
    } else {
      setOpenDropdown(categoryId);
      setSelectionPath([]);
    }
  };

  const selectCategoryAtLevel = (category: CategoryTreeNode, level: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (category.children.length === 0) {
      return;
    }

    setSelectionPath(prev => {
      const newPath = prev.slice(0, level);
      newPath[level] = category;
      return newPath;
    });
  };

  const buildPanels = (rootCategory: CategoryTreeNode) => {
    const panels: { categories: CategoryTreeNode[]; selectedId: string | null; parentCategory: CategoryTreeNode | null }[] = [];

    panels.push({
      categories: rootCategory.children,
      selectedId: selectionPath[0]?.id || null,
      parentCategory: rootCategory
    });

    selectionPath.forEach((selectedCat, index) => {
      if (selectedCat.children.length > 0) {
        panels.push({
          categories: selectedCat.children,
          selectedId: selectionPath[index + 1]?.id || null,
          parentCategory: selectedCat
        });
      }
    });

    return panels;
  };

  const handleMobileDrilldown = (category: CategoryTreeNode) => {
    if (category.children.length > 0) {
      setMobileDrilldownStack(prev => [...prev, category]);
    }
  };

  const handleMobileBack = () => {
    setMobileDrilldownStack(prev => prev.slice(0, -1));
  };

  const handleCategoryLinkClick = () => {
    setOpenDropdown(null);
    setSelectionPath([]);
    setIsMobileMenuOpen(false);
    setMobileDrilldownStack([]);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setMobileDrilldownStack([]);
  };

  const itemCount = getItemCount();
  const currentLang = languages.find((l) => l.code === language);

  const renderCategoryIcon = (category: CategoryTreeNode, size: 'sm' | 'md' | 'lg' = 'sm') => {
    const categoryName = `${category.name_en} ${category.name_uz} ${category.name_ru}`;
    const IconComponent = getSemanticIcon(category.icon, categoryName);
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };

    return <IconComponent className={`${sizeClasses[size]} text-orange-500 flex-shrink-0`} />;
  };

  const panelBackgrounds = [
    'bg-white',
    'bg-gray-50',
    'bg-slate-50',
    'bg-stone-50',
    'bg-zinc-50'
  ];

  const renderPanel = (panel: { categories: CategoryTreeNode[]; selectedId: string | null; parentCategory: CategoryTreeNode | null }, panelIndex: number): React.ReactNode => {
    const bgClass = panelBackgrounds[panelIndex % panelBackgrounds.length];
    const isFirstPanel = panelIndex === 0;

    return (
      <motion.div
        key={`panel-${panelIndex}-${panel.parentCategory?.id}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`flex-shrink-0 w-[220px] ${bgClass} ${!isFirstPanel ? 'border-l border-gray-200' : ''}`}
      >
        {!isFirstPanel && panel.parentCategory && (
          <div className="px-4 py-2.5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-transparent">
            <Link
              to={`/products?category=${panel.parentCategory.id}`}
              onClick={handleCategoryLinkClick}
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"
            >
              {language === 'uz' ? 'Hammasini ko\'rish' : language === 'ru' ? 'Смотреть все' : 'View All'}
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent py-1">
          {panel.categories.map(category => {
            const hasChildren = category.children.length > 0;
            const isSelected = panel.selectedId === category.id;

            if (hasChildren) {
              return (
                <button
                  key={category.id}
                  onClick={(e) => selectCategoryAtLevel(category, panelIndex, e)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150 ${
                    isSelected
                      ? 'text-orange-500 bg-orange-100 font-medium'
                      : 'text-gray-700 hover:text-orange-500 hover:bg-orange-50'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    {renderCategoryIcon(category, 'sm')}
                    {getLocalizedField(category, 'name')}
                  </span>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-orange-500' : 'text-gray-400'}`} />
                </button>
              );
            }

            return (
              <Link
                key={category.id}
                to={`/products?category=${category.id}`}
                onClick={handleCategoryLinkClick}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 transition-all duration-150"
              >
                {renderCategoryIcon(category, 'sm')}
                <span className="truncate">{getLocalizedField(category, 'name')}</span>
              </Link>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const renderMultiPanelDropdown = (rootCategory: CategoryTreeNode): React.ReactNode => {
    const panels = buildPanels(rootCategory);

    return (
      <div className="flex rounded-xl overflow-hidden shadow-2xl border border-gray-100">
        {panels.map((panel, index) => (
          <AnimatePresence key={`panel-container-${index}`} mode="wait">
            {renderPanel(panel, index)}
          </AnimatePresence>
        ))}
      </div>
    );
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className={`hidden md:block transition-all duration-300 ${isScrolled ? 'bg-gray-900' : 'bg-gray-900/95 backdrop-blur-sm'}`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-12">
              <Link to="/" className="flex items-center gap-2 group">
                <motion.img
                  src="/yulduz_orange.png"
                  alt="ORZUTECH Logo"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold text-white tracking-wide group-hover:text-orange-400 transition-colors">
                  ORZUTECH
                </span>
              </Link>

              <nav className="flex items-center gap-1">
                {topNavLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.key}
                      to={link.path}
                      className={`relative px-4 py-2 flex items-center gap-2 text-sm font-medium transition-all duration-300 group ${
                        isActive ? 'text-orange-400' : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-orange-400' : ''}`} />
                      <span>{link.label[language]}</span>
                      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-orange-500 rounded-full transition-all duration-300 ${
                        isActive ? 'w-8' : 'w-0 group-hover:w-8'
                      }`} />
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-4">
                <a
                  href="tel:+998652000002"
                  className="flex items-center gap-2 text-gray-300 hover:text-orange-400 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">{t.nav.phone}</span>
                </a>

                <div ref={langMenuRef} className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {currentLang?.code.toUpperCase()}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                  </motion.button>

                  <AnimatePresence>
                    {isLangMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100]"
                      >
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setLanguage(lang.code);
                              setIsLangMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors ${
                              language === lang.code ? 'bg-orange-50 text-orange-500' : 'text-gray-700'
                            }`}
                          >
                            <span className="text-sm font-medium">{lang.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`transition-all duration-300 ${isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm shadow-sm'}`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between gap-4 h-14 md:h-16">
              <Link to="/" className="md:hidden flex items-center gap-2 group">
                <motion.img
                  src="/yulduz_orange.png"
                  alt="ORZUTECH Logo"
                  whileHover={{ scale: 1.05 }}
                  className="w-8 h-8 object-contain"
                />
                <span className="text-lg font-bold text-gray-900 tracking-wide">
                  ORZUTECH
                </span>
              </Link>

              <nav ref={navRef} className="hidden lg:flex items-center gap-1">
                {headerCategories.map((category) => {
                  const hasChildren = category.children.length > 0;
                  const isOpen = openDropdown === category.id;
                  const isActive = location.search.includes(category.id);

                  if (hasChildren) {
                    return (
                      <div key={category.id} className="relative">
                        <button
                          onClick={(e) => toggleDropdown(category.id, e)}
                          className="group relative px-3 py-2 flex items-center gap-2"
                        >
                          <span className="relative z-10 transition-transform duration-300 ease-out group-hover:scale-110">
                            {renderCategoryIcon(category, 'sm')}
                          </span>
                          <span className={`relative z-10 text-sm font-semibold tracking-wide transition-all duration-300 ease-out group-hover:-translate-y-0.5 inline-block ${
                            isOpen || isActive ? 'text-orange-500' : 'text-gray-700 group-hover:text-orange-500'
                          }`}>
                            {getLocalizedField(category, 'name')}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-all duration-300 ease-out ${
                            isOpen ? 'rotate-180 text-orange-500' : isActive ? 'text-orange-500' : 'text-gray-500 group-hover:text-orange-500 group-hover:-translate-y-0.5'
                          }`} />
                          <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-300 ease-out ${
                            isOpen || isActive ? 'w-6 opacity-100' : 'w-0 opacity-0 group-hover:w-6 group-hover:opacity-100'
                          }`} />
                          <span className={`absolute inset-0 rounded-xl transition-colors duration-300 ${
                            isOpen ? 'bg-orange-500/10' : 'bg-orange-500/0 group-hover:bg-orange-500/5'
                          }`} />
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 12, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.98 }}
                              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              className="absolute top-full left-0 mt-3 z-[100]"
                            >
                              <div className="bg-white rounded-t-xl px-4 py-2.5 border-x border-t border-gray-100 shadow-sm">
                                <Link
                                  to={`/products?category=${category.id}`}
                                  onClick={handleCategoryLinkClick}
                                  className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1 group/link"
                                >
                                  {language === 'uz' ? 'Hammasini ko\'rish' : language === 'ru' ? 'Смотреть все' : 'View All'}
                                  <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" />
                                </Link>
                              </div>
                              {renderMultiPanelDropdown(category)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={category.id}
                      to={`/products?category=${category.id}`}
                      className="group relative px-3 py-2 flex items-center gap-2"
                    >
                      <span className="relative z-10 transition-transform duration-300 ease-out group-hover:scale-110">
                        {renderCategoryIcon(category, 'sm')}
                      </span>
                      <span className={`relative z-10 text-sm font-semibold tracking-wide transition-all duration-300 ease-out group-hover:-translate-y-0.5 inline-block ${
                        isActive ? 'text-orange-500' : 'text-gray-700 group-hover:text-orange-500'
                      }`}>
                        {getLocalizedField(category, 'name')}
                      </span>
                      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-300 ease-out ${
                        isActive ? 'w-6 opacity-100' : 'w-0 opacity-0 group-hover:w-6 group-hover:opacity-100'
                      }`} />
                      <span className="absolute inset-0 rounded-xl bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors duration-300" />
                    </Link>
                  );
                })}
              </nav>

              <div className="hidden md:block flex-1" />

              <div className="flex items-center gap-2 md:gap-3">
                <motion.button
                  onClick={() => setIsSearchOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-2 md:p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-shadow"
                >
                  <Search className="w-5 h-5" />
                </motion.button>

                <Link to="/cart">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <ShoppingCart className="w-6 h-6 text-gray-700" />
                    {itemCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                      >
                        {itemCount}
                      </motion.span>
                    )}
                  </motion.div>
                </Link>

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6 text-gray-700" />
                  ) : (
                    <Menu className="w-6 h-6 text-gray-700" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="h-14 md:h-[7.5rem]" />

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={closeMobileMenu}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-50 lg:hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2">
                  <img src="/yulduz_orange.png" alt="ORZUTECH" className="w-8 h-8 object-contain" />
                  <span className="text-lg font-bold text-gray-900">ORZUTECH</span>
                </Link>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-700" />
                </button>
              </div>

              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {language === 'uz' ? 'Sahifalar' : language === 'ru' ? 'Страницы' : 'Pages'}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {topNavLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;
                    return (
                      <Link
                        key={link.key}
                        to={link.path}
                        onClick={closeMobileMenu}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                            : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {link.label[language]}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {mobileDrilldownStack.length === 0 ? (
                    <motion.div
                      key="root-menu"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-4"
                    >
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        {language === 'uz' ? 'Kategoriyalar' : language === 'ru' ? 'Категории' : 'Categories'}
                      </p>

                      <div className="space-y-1">
                        {headerCategories.map((category) => {
                          const hasChildren = category.children.length > 0;
                          const isActive = location.search.includes(category.id);

                          if (hasChildren) {
                            return (
                              <button
                                key={category.id}
                                onClick={() => handleMobileDrilldown(category)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                                  isActive ? 'bg-orange-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <span className="flex items-center gap-3">
                                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                                    {renderCategoryIcon(category, 'md')}
                                  </span>
                                  <span className={`text-sm font-semibold ${isActive ? 'text-orange-500' : 'text-gray-700'}`}>
                                    {getLocalizedField(category, 'name')}
                                  </span>
                                </span>
                                <ChevronRight className={`w-5 h-5 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                              </button>
                            );
                          }

                          return (
                            <Link
                              key={category.id}
                              to={`/products?category=${category.id}`}
                              onClick={closeMobileMenu}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                isActive ? 'bg-orange-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                                {renderCategoryIcon(category, 'md')}
                              </span>
                              <span className={`text-sm font-semibold ${isActive ? 'text-orange-500' : 'text-gray-700'}`}>
                                {getLocalizedField(category, 'name')}
                              </span>
                            </Link>
                          );
                        })}
                      </div>

                      <Link
                        to="/products"
                        onClick={closeMobileMenu}
                        className="flex items-center justify-between mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25"
                      >
                        <span className="text-sm font-semibold">{t.home.viewAll}</span>
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`drilldown-${mobileDrilldownStack.length}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <button
                        onClick={handleMobileBack}
                        className="w-full flex items-center gap-3 px-6 py-4 font-semibold text-orange-500 bg-orange-50 border-b border-orange-100"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        <span>{language === 'uz' ? 'Orqaga' : language === 'ru' ? 'Назад' : 'Back'}</span>
                      </button>

                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                          {renderCategoryIcon(mobileDrilldownStack[mobileDrilldownStack.length - 1], 'md')}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {getLocalizedField(mobileDrilldownStack[mobileDrilldownStack.length - 1], 'name')}
                        </span>
                      </div>

                      <Link
                        to={`/products?category=${mobileDrilldownStack[mobileDrilldownStack.length - 1].id}`}
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-orange-500 border-b border-gray-100"
                      >
                        {language === 'uz' ? 'Hammasini ko\'rish' : language === 'ru' ? 'Смотреть все' : 'View All'}
                        <ChevronRight className="w-4 h-4" />
                      </Link>

                      <div className="p-4 space-y-1">
                        {mobileDrilldownStack[mobileDrilldownStack.length - 1].children.map((category) => {
                          const hasChildren = category.children.length > 0;

                          if (hasChildren) {
                            return (
                              <button
                                key={category.id}
                                onClick={() => handleMobileDrilldown(category)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 transition-all"
                              >
                                <span className="flex items-center gap-3">
                                  {renderCategoryIcon(category, 'sm')}
                                  <span className="text-sm font-medium text-gray-700">
                                    {getLocalizedField(category, 'name')}
                                  </span>
                                </span>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              </button>
                            );
                          }

                          return (
                            <Link
                              key={category.id}
                              to={`/products?category=${category.id}`}
                              onClick={closeMobileMenu}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all"
                            >
                              {renderCategoryIcon(category, 'sm')}
                              <span className="text-sm font-medium text-gray-700">
                                {getLocalizedField(category, 'name')}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <a href="tel:+998652000002" className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-5 h-5 text-orange-500" />
                    <span className="text-sm font-semibold">{t.nav.phone}</span>
                  </a>

                  <div className="flex gap-1">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          language === lang.code
                            ? 'bg-orange-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {lang.code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
