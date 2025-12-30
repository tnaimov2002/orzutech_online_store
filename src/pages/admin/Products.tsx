import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Play
} from 'lucide-react';
import { Product, Category } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { fetchAllProducts, triggerCategorySync, triggerProductSync } from '../../services/productService';
import { formatPrice } from '../../utils/format';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ProductModal from '../../components/admin/ProductModal';

interface SyncStatus {
  id: string;
  entity: string;
  status: 'success' | 'error' | 'in_progress' | 'pending' | 'running' | 'idle';
  message: string | null;
  records_synced: number;
  total: number;
  processed: number;
  percent: number;
  last_sync_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string | null;
}

const LOW_STOCK_THRESHOLD = 5;

export default function Products() {
  const { t, getLocalizedField, language } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<'idle' | 'categories' | 'products'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categorySyncStatus, setCategorySyncStatus] = useState<SyncStatus | null>(null);
  const [productSyncStatus, setProductSyncStatus] = useState<SyncStatus | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const previousProductStatusRef = useRef<string | null>(null);

  const loadSyncStatus = useCallback(async () => {
    const { data: categoryData } = await supabase
      .from('sync_status')
      .select('*')
      .eq('entity', 'categories')
      .maybeSingle();

    if (categoryData) {
      setCategorySyncStatus(categoryData as SyncStatus);
    }

    const { data: productData } = await supabase
      .from('sync_status')
      .select('*')
      .eq('entity', 'products')
      .maybeSingle();

    if (productData) {
      setProductSyncStatus(productData as SyncStatus);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllProducts();
    setProducts(data);
    setLoading(false);
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');

    if (data) setCategories(data);
  };

  useEffect(() => {
    loadProducts();
    fetchCategories();
    loadSyncStatus();
  }, [loadSyncStatus, loadProducts]);

  useEffect(() => {
    const channel = supabase
      .channel('sync_status_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_status',
        },
        (payload) => {
          const newStatus = payload.new as SyncStatus;

          if (newStatus.entity === 'categories') {
            setCategorySyncStatus(newStatus);
          } else if (newStatus.entity === 'products') {
            setProductSyncStatus(newStatus);

            if (
              previousProductStatusRef.current &&
              previousProductStatusRef.current === 'running' &&
              (newStatus.status === 'success' || newStatus.status === 'error')
            ) {
              loadProducts();
              fetchCategories();
              setSyncing(false);
              setSyncPhase('idle');
            }

            previousProductStatusRef.current = newStatus.status;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProducts]);

  useEffect(() => {
    if (productSyncStatus) {
      previousProductStatusRef.current = productSyncStatus.status;
    }
  }, [productSyncStatus]);

  useEffect(() => {
    if (isDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isDeleteModalOpen]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncPhase('categories');

    const categoryResult = await triggerCategorySync();

    if (!categoryResult.ok) {
      setSyncError(categoryResult.error || 'Category sync failed');
      setSyncing(false);
      setSyncPhase('idle');
      return;
    }

    setSyncPhase('products');
    const productResult = await triggerProductSync();

    if (!productResult.ok) {
      setSyncError(productResult.error || 'Product sync failed');
    }
  };

  const formatSyncTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString(language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleModalSuccess = () => {
    loadProducts();
  };

  const handleDeleteClick = (product: Product) => {
    setDeletingProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;

    setIsDeleting(true);
    try {
      const productImages = deletingProduct.product_images || [];
      for (const img of productImages) {
        const urlParts = img.image_url.split('/');
        const pathIndex = urlParts.indexOf('product-images');
        if (pathIndex !== -1) {
          const path = urlParts.slice(pathIndex + 1).join('/');
          await supabase.storage.from('product-images').remove([path]);
        }
      }

      await supabase.from('products').delete().eq('id', deletingProduct.id);
      setIsDeleteModalOpen(false);
      setDeletingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name_uz?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (qty: number) => {
    if (qty === 0) return 'out';
    if (qty <= LOW_STOCK_THRESHOLD) return 'low';
    return 'ok';
  };

  const isSyncRunning =
    syncing ||
    categorySyncStatus?.status === 'running' ||
    productSyncStatus?.status === 'running';

  const currentSyncStatus = syncPhase === 'categories' ? categorySyncStatus : productSyncStatus;
  const currentPercent = currentSyncStatus?.percent || 0;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, Record<string, string>> = {
      success: { uz: 'Muvaffaqiyatli', ru: 'Успешно', en: 'Success' },
      error: { uz: 'Xato', ru: 'Ошибка', en: 'Error' },
      running: { uz: 'Ishlayapti', ru: 'Выполняется', en: 'Running' },
      in_progress: { uz: 'Jarayonda', ru: 'В процессе', en: 'In Progress' },
      pending: { uz: 'Kutilmoqda', ru: 'Ожидание', en: 'Pending' },
      idle: { uz: 'Tayyor', ru: 'Готово', en: 'Idle' },
    };
    return labels[status]?.[language] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'running':
      case 'in_progress': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'running':
      case 'in_progress': return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'idle': return <Play className="w-5 h-5 text-gray-400" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getProgressBarColor = (status: string | undefined) => {
    switch (status) {
      case 'success': return 'from-green-600 to-green-400';
      case 'error': return 'from-red-600 to-red-400';
      default: return 'from-blue-600 to-blue-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t.admin.products}</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'uz' ? 'Qidirish...' : language === 'ru' ? 'Поиск...' : 'Search...'}
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSync}
            disabled={isSyncRunning}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncRunning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {language === 'uz' ? 'Sinxronlash' : language === 'ru' ? 'Синхронизация' : 'Sync'}
            </span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t.admin.addProduct}</span>
          </motion.button>
        </div>
      </div>

      {(isSyncRunning || productSyncStatus || categorySyncStatus) && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">
                {language === 'uz' ? 'Sinxronizatsiya' : language === 'ru' ? 'Синхронизация' : 'Sync Status'}
              </span>
            </div>

            {syncPhase !== 'idle' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-lg">
                <span className="text-sm font-medium text-blue-400">
                  {syncPhase === 'categories'
                    ? (language === 'uz' ? 'Kategoriyalar' : language === 'ru' ? 'Категории' : 'Categories')
                    : (language === 'uz' ? 'Mahsulotlar' : language === 'ru' ? 'Товары' : 'Products')}
                </span>
              </div>
            )}

            {productSyncStatus && !isSyncRunning && (
              <>
                <div className="flex items-center gap-2">
                  {getStatusIcon(productSyncStatus.status)}
                  <span className={`text-sm font-medium ${getStatusColor(productSyncStatus.status)}`}>
                    {getStatusLabel(productSyncStatus.status)}
                  </span>
                </div>

                {productSyncStatus.records_synced > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="font-medium text-white">{productSyncStatus.records_synced}</span>
                    {language === 'uz' ? 'ta mahsulot' : language === 'ru' ? 'товаров' : 'products'}
                  </div>
                )}

                {(productSyncStatus.last_sync_at || productSyncStatus.finished_at) && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
                    <Clock className="w-4 h-4" />
                    {formatSyncTime(productSyncStatus.finished_at || productSyncStatus.last_sync_at)}
                  </div>
                )}
              </>
            )}
          </div>

          {isSyncRunning && currentSyncStatus && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="font-medium text-white">{currentSyncStatus.processed || 0}</span>
                  <span>/</span>
                  <span>{currentSyncStatus.total || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-400">{currentPercent}%</span>
                </div>
              </div>

              <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${getProgressBarColor(currentSyncStatus.status)} rounded-full relative`}
                  initial={{ width: 0 }}
                  animate={{ width: `${currentPercent}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {currentPercent > 10 && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                      {currentPercent}%
                    </span>
                  )}
                </motion.div>
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {language === 'uz' ? 'Qayta ishlangan' : language === 'ru' ? 'Обработано' : 'Processed'}: {currentSyncStatus.processed || 0}
                </span>
                <span>
                  {language === 'uz' ? 'Jami' : language === 'ru' ? 'Всего' : 'Total'}: {currentSyncStatus.total || 0}
                </span>
              </div>

              {currentSyncStatus.message && (
                <div className="text-xs text-gray-400">
                  {currentSyncStatus.message}
                </div>
              )}
            </div>
          )}

          {productSyncStatus?.status === 'success' && !isSyncRunning && (
            <div className="flex items-center gap-3">
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full w-full" />
              </div>
              <span className="text-lg font-bold text-green-400 whitespace-nowrap">100%</span>
            </div>
          )}

          {syncError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{syncError}</p>
            </div>
          )}

          {productSyncStatus?.message && productSyncStatus.status === 'error' && !isSyncRunning && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{productSyncStatus.message}</p>
            </div>
          )}

          {productSyncStatus?.message && productSyncStatus.status === 'success' && !isSyncRunning && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400">{productSyncStatus.message}</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {language === 'uz' ? 'Mahsulotlar topilmadi' : language === 'ru' ? 'Товары не найдены' : 'No products found'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product, index) => {
            const primaryImage = product.product_images?.find((img) => img.is_primary)?.image_url
              || product.product_images?.[0]?.image_url
              || 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400';
            const stockQty = product.stock || product.stock_quantity || 0;
            const stockStatus = getStockStatus(stockQty);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden hover:border-gray-600 transition-colors"
              >
                <div className="relative aspect-square">
                  <img
                    src={primaryImage}
                    alt={product.name_uz || product.name_en}
                    className="w-full h-full object-cover"
                  />
                  {stockStatus === 'out' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-lg">
                        {t.admin.outOfStock}
                      </span>
                    </div>
                  )}
                  {stockStatus === 'low' && (
                    <div className="absolute top-2 right-2">
                      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500 text-black text-xs font-medium rounded-lg">
                        <AlertTriangle className="w-3 h-3" />
                        {t.admin.lowStock}
                      </span>
                    </div>
                  )}
                  {product.moysklad_id && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-blue-500/80 text-white text-xs font-medium rounded-lg">
                        MoySklad
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {product.brand && (
                    <p className="text-xs text-gray-500 font-medium uppercase">{product.brand}</p>
                  )}
                  <h3 className="font-medium text-white mt-1 line-clamp-2">
                    {getLocalizedField(product, 'name')}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-bold text-white">
                      {formatPrice(product.price)} <span className="text-sm font-normal text-gray-500">{t.common.sum}</span>
                    </p>
                    <p className={`text-sm font-medium ${
                      stockStatus === 'out' ? 'text-red-400' : stockStatus === 'low' ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {language === 'uz' ? 'Ombor' : language === 'ru' ? 'Склад' : 'Stock'}: {stockQty}
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      {t.admin.edit}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(product)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        editingProduct={editingProduct}
        categories={categories}
      />

      <AnimatePresence>
        {isDeleteModalOpen && deletingProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-gray-900 rounded-2xl overflow-hidden border border-gray-700"
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {language === 'uz' ? "Mahsulotni o'chirish" : language === 'ru' ? 'Удалить товар' : 'Delete Product'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {getLocalizedField(deletingProduct, 'name')}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-6">
                    {language === 'uz'
                      ? "Bu amalni ortga qaytarib bo'lmaydi. Davom etmoqchimisiz?"
                      : language === 'ru'
                        ? 'Это действие нельзя отменить. Продолжить?'
                        : 'This action cannot be undone. Continue?'}
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={isDeleting}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                    >
                      {t.admin.cancel}
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {language === 'uz' ? "O'chirilmoqda..." : language === 'ru' ? 'Удаление...' : 'Deleting...'}
                        </>
                      ) : (
                        language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
