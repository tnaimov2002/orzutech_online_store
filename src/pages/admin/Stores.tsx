import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Store, MapPin, Clock, Phone, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { StoreLocation } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminModal from '../../components/admin/AdminModal';

const initialFormData = {
  name_uz: '',
  name_ru: '',
  name_en: '',
  address_uz: '',
  address_ru: '',
  address_en: '',
  working_hours: '',
  phone: '',
  maps_url: '',
  is_active: true,
};

export default function Stores() {
  const { t, getLocalizedField, language } = useLanguage();

  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);
  const [deletingStore, setDeletingStore] = useState<StoreLocation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState(initialFormData);
  const initialFormRef = useRef(initialFormData);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (isDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isDeleteModalOpen]);

  const fetchStores = async () => {
    const { data } = await supabase
      .from('store_locations')
      .select('*')
      .order('name_en');

    if (data) setStores(data);
    setLoading(false);
  };

  const isFormValid = formData.name_uz.trim() && formData.name_ru.trim() && formData.name_en.trim()
    && formData.address_uz.trim() && formData.address_ru.trim() && formData.address_en.trim()
    && formData.working_hours.trim();

  const hasFormChanged = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormRef.current);
  };

  const handleCloseModal = () => {
    if (hasFormChanged()) {
      const confirmClose = window.confirm(
        language === 'uz'
          ? "O'zgarishlar saqlanmagan. Davom etmoqchimisiz?"
          : language === 'ru'
            ? 'Изменения не сохранены. Продолжить?'
            : 'Changes not saved. Continue?'
      );
      if (!confirmClose) return;
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isFormValid) {
      setFormError(
        language === 'uz'
          ? "Barcha kerakli maydonlarni to'ldiring"
          : language === 'ru'
            ? 'Заполните все обязательные поля'
            : 'Please fill in all required fields'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingStore) {
        const { error } = await supabase
          .from('store_locations')
          .update(formData)
          .eq('id', editingStore.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('store_locations').insert(formData);
        if (error) throw error;
      }

      setIsModalOpen(false);
      resetForm();
      fetchStores();
    } catch (error) {
      setFormError(
        language === 'uz'
          ? "Xatolik yuz berdi. Qaytadan urinib ko'ring."
          : language === 'ru'
            ? 'Произошла ошибка. Попробуйте еще раз.'
            : 'An error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (store: StoreLocation) => {
    setEditingStore(store);
    const editFormData = {
      name_uz: store.name_uz,
      name_ru: store.name_ru,
      name_en: store.name_en,
      address_uz: store.address_uz,
      address_ru: store.address_ru,
      address_en: store.address_en,
      working_hours: store.working_hours,
      phone: store.phone || '',
      maps_url: store.maps_url || '',
      is_active: store.is_active,
    };
    setFormData(editFormData);
    initialFormRef.current = editFormData;
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (store: StoreLocation) => {
    setDeletingStore(store);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStore) return;

    setIsDeleting(true);
    try {
      await supabase.from('store_locations').delete().eq('id', deletingStore.id);
      setIsDeleteModalOpen(false);
      setDeletingStore(null);
      fetchStores();
    } catch (error) {
      console.error('Error deleting store:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActive = async (store: StoreLocation) => {
    await supabase
      .from('store_locations')
      .update({ is_active: !store.is_active })
      .eq('id', store.id);

    setStores((prev) =>
      prev.map((s) => (s.id === store.id ? { ...s, is_active: !s.is_active } : s))
    );
  };

  const resetForm = () => {
    setEditingStore(null);
    setFormData(initialFormData);
    initialFormRef.current = initialFormData;
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.admin.stores}</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          {language === 'uz' ? 'Do\'kon qo\'shish' : language === 'ru' ? 'Добавить магазин' : 'Add Store'}
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {language === 'uz' ? 'Do\'konlar topilmadi' : language === 'ru' ? 'Магазины не найдены' : 'No stores found'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store, index) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gray-800/50 rounded-2xl border p-6 ${
                store.is_active ? 'border-gray-700/50' : 'border-red-500/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    store.is_active ? 'bg-orange-500/20' : 'bg-gray-700'
                  }`}>
                    <Store className={`w-6 h-6 ${store.is_active ? 'text-orange-500' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {getLocalizedField(store, 'name')}
                    </h3>
                    {!store.is_active && (
                      <span className="text-xs text-red-400">
                        {language === 'uz' ? 'Faol emas' : language === 'ru' ? 'Неактивно' : 'Inactive'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">{getLocalizedField(store, 'address')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">{store.working_hours}</span>
                </div>
                {store.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-300">{store.phone}</span>
                  </div>
                )}
                {store.maps_url && (
                  <a
                    href={store.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-orange-500 hover:text-orange-400"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {language === 'uz' ? 'Xaritada ochish' : language === 'ru' ? 'Открыть на карте' : 'Open in Maps'}
                  </a>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700/50 flex gap-2">
                <button
                  onClick={() => toggleActive(store)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    store.is_active
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {store.is_active
                    ? (language === 'uz' ? 'Faol' : language === 'ru' ? 'Активно' : 'Active')
                    : (language === 'uz' ? 'Faollashtirish' : language === 'ru' ? 'Активировать' : 'Activate')
                  }
                </button>
                <button
                  onClick={() => handleEdit(store)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(store)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AdminModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={editingStore
          ? (language === 'uz' ? 'Do\'konni tahrirlash' : language === 'ru' ? 'Редактировать магазин' : 'Edit Store')
          : (language === 'uz' ? 'Do\'kon qo\'shish' : language === 'ru' ? 'Добавить магазин' : 'Add Store')
        }
        icon={<Store className="w-5 h-5 text-orange-500" />}
        isSubmitting={isSubmitting}
        isFormValid={isFormValid}
        isEditing={!!editingStore}
        size="md"
      >
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Nomi' : language === 'ru' ? 'Название' : 'Name'} *
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={formData.name_uz}
              onChange={(e) => setFormData({ ...formData, name_uz: e.target.value })}
              placeholder="UZ"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={formData.name_ru}
              onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
              placeholder="RU"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              placeholder="EN"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Manzil' : language === 'ru' ? 'Адрес' : 'Address'} *
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={formData.address_uz}
              onChange={(e) => setFormData({ ...formData, address_uz: e.target.value })}
              placeholder="UZ"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={formData.address_ru}
              onChange={(e) => setFormData({ ...formData, address_ru: e.target.value })}
              placeholder="RU"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={formData.address_en}
              onChange={(e) => setFormData({ ...formData, address_en: e.target.value })}
              placeholder="EN"
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Ish vaqti' : language === 'ru' ? 'Время работы' : 'Working Hours'} *
          </label>
          <input
            type="text"
            value={formData.working_hours}
            onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
            placeholder="09:00 - 21:00"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Telefon' : language === 'ru' ? 'Телефон' : 'Phone'}
          </label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+998 65 221 00 00"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Google Maps URL
          </label>
          <input
            type="url"
            value={formData.maps_url}
            onChange={(e) => setFormData({ ...formData, maps_url: e.target.value })}
            placeholder="https://maps.google.com/..."
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500"
          />
          <span className="text-gray-300">
            {language === 'uz' ? 'Faol' : language === 'ru' ? 'Активно' : 'Active'}
          </span>
        </label>

        {formError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{formError}</p>
          </div>
        )}
      </AdminModal>

      <AnimatePresence>
        {isDeleteModalOpen && deletingStore && (
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
                        {language === 'uz' ? "Do'konni o'chirish" : language === 'ru' ? 'Удалить магазин' : 'Delete Store'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {getLocalizedField(deletingStore, 'name')}
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
