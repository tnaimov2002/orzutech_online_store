import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Image, Eye, EyeOff } from 'lucide-react';
import { Banner } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminModal from '../../components/admin/AdminModal';

const initialFormData = {
  title_uz: '',
  title_ru: '',
  title_en: '',
  subtitle_uz: '',
  subtitle_ru: '',
  subtitle_en: '',
  image_url: '',
  link_url: '',
  is_active: true,
  sort_order: 0,
};

export default function Banners() {
  const { t, getLocalizedField, language } = useLanguage();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState(initialFormData);
  const initialFormRef = useRef(initialFormData);

  useEffect(() => {
    fetchBanners();
  }, []);


  const fetchBanners = async () => {
    const { data } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order');

    if (data) setBanners(data);
    setLoading(false);
  };

  const isFormValid = formData.image_url.trim();

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
          ? "Rasm URL manzilini kiriting"
          : language === 'ru'
            ? 'Введите URL изображения'
            : 'Please enter an image URL'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update(formData)
          .eq('id', editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banners').insert(formData);
        if (error) throw error;
      }

      setIsModalOpen(false);
      resetForm();
      fetchBanners();
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

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    const editFormData = {
      title_uz: banner.title_uz,
      title_ru: banner.title_ru,
      title_en: banner.title_en,
      subtitle_uz: banner.subtitle_uz,
      subtitle_ru: banner.subtitle_ru,
      subtitle_en: banner.subtitle_en,
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      is_active: banner.is_active,
      sort_order: banner.sort_order,
    };
    setFormData(editFormData);
    initialFormRef.current = editFormData;
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm(
      language === 'uz'
        ? "Bannerni o'chirmoqchimisiz?"
        : language === 'ru'
          ? 'Удалить баннер?'
          : 'Are you sure you want to delete this banner?'
    );
    if (!confirmDelete) return;

    await supabase.from('banners').delete().eq('id', id);
    fetchBanners();
  };

  const toggleActive = async (banner: Banner) => {
    await supabase
      .from('banners')
      .update({ is_active: !banner.is_active })
      .eq('id', banner.id);

    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, is_active: !b.is_active } : b))
    );
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData(initialFormData);
    initialFormRef.current = initialFormData;
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.admin.banners}</h1>
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
          {language === 'uz' ? 'Banner qo\'shish' : language === 'ru' ? 'Добавить баннер' : 'Add Banner'}
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {language === 'uz' ? 'Bannerlar topilmadi' : language === 'ru' ? 'Баннеры не найдены' : 'No banners found'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden"
            >
              <div className="relative aspect-[2/1]">
                <img
                  src={banner.image_url}
                  alt={banner.title_en}
                  className="w-full h-full object-cover"
                />
                {!banner.is_active && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="px-3 py-1 bg-gray-500 text-white text-sm font-medium rounded-lg">
                      {language === 'uz' ? 'Faol emas' : language === 'ru' ? 'Неактивно' : 'Inactive'}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white">
                  {getLocalizedField(banner, 'title')}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {getLocalizedField(banner, 'subtitle')}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(banner)}
                    className={`p-2 rounded-lg transition-colors ${
                      banner.is_active
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AdminModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={editingBanner
          ? (language === 'uz' ? 'Bannerni tahrirlash' : language === 'ru' ? 'Редактировать баннер' : 'Edit Banner')
          : (language === 'uz' ? 'Banner qo\'shish' : language === 'ru' ? 'Добавить баннер' : 'Add Banner')
        }
        icon={<Image className="w-5 h-5 text-orange-500" />}
        isSubmitting={isSubmitting}
        isFormValid={!!isFormValid}
        isEditing={!!editingBanner}
        size="md"
      >
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Rasm URL' : language === 'ru' ? 'URL изображения' : 'Image URL'} *
          </label>
          <input
            type="url"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            required
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Sarlavha' : language === 'ru' ? 'Заголовок' : 'Title'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={formData.title_uz}
              onChange={(e) => setFormData({ ...formData, title_uz: e.target.value })}
              placeholder="UZ"
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={formData.title_ru}
              onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
              placeholder="RU"
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={formData.title_en}
              onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
              placeholder="EN"
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Tavsif' : language === 'ru' ? 'Описание' : 'Subtitle'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={formData.subtitle_uz}
              onChange={(e) => setFormData({ ...formData, subtitle_uz: e.target.value })}
              placeholder="UZ"
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={formData.subtitle_ru}
              onChange={(e) => setFormData({ ...formData, subtitle_ru: e.target.value })}
              placeholder="RU"
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <input
              type="text"
              value={formData.subtitle_en}
              onChange={(e) => setFormData({ ...formData, subtitle_en: e.target.value })}
              placeholder="EN"
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Havola URL' : language === 'ru' ? 'URL ссылки' : 'Link URL'}
          </label>
          <input
            type="text"
            value={formData.link_url}
            onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
            placeholder="/products"
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              {language === 'uz' ? 'Tartib:' : language === 'ru' ? 'Порядок:' : 'Sort Order:'}
            </span>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
              className="w-20 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{formError}</p>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
