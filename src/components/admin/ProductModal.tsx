import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Package,
  Loader2,
  Upload,
  ChevronUp,
  ChevronDown,
  Eye,
  AlertCircle,
  AlertTriangle,
  ImageIcon,
  CheckCircle,
  Link,
  Plus
} from 'lucide-react';
import { Product, Category } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';

interface ProductImage {
  id?: string;
  url: string;
  file?: File;
  is_primary: boolean;
  source: 'url' | 'upload';
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProduct: Product | null;
  categories: Category[];
}

interface FieldError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
}

const initialFormData = {
  name_uz: '',
  name_ru: '',
  name_en: '',
  description_uz: '',
  description_ru: '',
  description_en: '',
  price: 0,
  original_price: 0,
  category_id: '',
  brand: '',
  stock_quantity: 0,
  warranty_uz: '',
  warranty_ru: '',
  warranty_en: '',
  sku: '',
  is_new: false,
  is_popular: false,
  is_discount: false,
};

const LOW_STOCK_THRESHOLD = 5;
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const parseSupabaseError = (error: unknown, language: string): { message: string; field?: string } => {
  if (!error) {
    return {
      message: language === 'uz' ? 'Noma\'lum xatolik' : language === 'ru' ? 'Неизвестная ошибка' : 'Unknown error'
    };
  }

  const err = error as { message?: string; code?: string; details?: string; hint?: string };

  console.error('[ProductModal] Supabase Error Details:', {
    message: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
    fullError: error
  });

  if (err.code === '23505') {
    if (err.message?.includes('sku')) {
      return {
        field: 'sku',
        message: language === 'uz' ? 'Bu SKU allaqachon mavjud' : language === 'ru' ? 'Этот SKU уже существует' : 'This SKU already exists'
      };
    }
    return {
      message: language === 'uz' ? 'Bu qiymat allaqachon mavjud' : language === 'ru' ? 'Это значение уже существует' : 'This value already exists'
    };
  }

  if (err.code === '23503') {
    if (err.message?.includes('category_id')) {
      return {
        field: 'category_id',
        message: language === 'uz' ? 'Kategoriya topilmadi' : language === 'ru' ? 'Категория не найдена' : 'Category not found'
      };
    }
    return {
      message: language === 'uz' ? 'Bog\'liq ma\'lumot topilmadi' : language === 'ru' ? 'Связанные данные не найдены' : 'Related data not found'
    };
  }

  if (err.code === '22P02') {
    return {
      message: language === 'uz' ? 'Noto\'g\'ri ma\'lumot formati' : language === 'ru' ? 'Неверный формат данных' : 'Invalid data format'
    };
  }

  if (err.code === '23502') {
    const match = err.message?.match(/column "(\w+)"/);
    const columnName = match ? match[1] : null;
    const fieldMap: Record<string, string> = {
      name_uz: language === 'uz' ? 'Nomi (UZ)' : language === 'ru' ? 'Название (UZ)' : 'Name (UZ)',
      name_ru: language === 'uz' ? 'Nomi (RU)' : language === 'ru' ? 'Название (RU)' : 'Name (RU)',
      name_en: language === 'uz' ? 'Nomi (EN)' : language === 'ru' ? 'Название (EN)' : 'Name (EN)',
      price: language === 'uz' ? 'Narx' : language === 'ru' ? 'Цена' : 'Price',
    };
    const fieldLabel = columnName ? fieldMap[columnName] || columnName : '';
    return {
      field: columnName || undefined,
      message: fieldLabel
        ? (language === 'uz' ? `${fieldLabel} majburiy` : language === 'ru' ? `${fieldLabel} обязательно` : `${fieldLabel} is required`)
        : (language === 'uz' ? 'Majburiy maydon to\'ldirilmagan' : language === 'ru' ? 'Обязательное поле не заполнено' : 'Required field is missing')
    };
  }

  if (err.code === '42501') {
    return {
      message: language === 'uz' ? 'Ruxsat yo\'q. Iltimos qayta kiring.' : language === 'ru' ? 'Нет доступа. Пожалуйста, войдите снова.' : 'Access denied. Please log in again.'
    };
  }

  if (err.message?.includes('Storage')) {
    return {
      message: language === 'uz' ? 'Rasmni yuklashda xatolik' : language === 'ru' ? 'Ошибка загрузки изображения' : 'Error uploading image'
    };
  }

  if (err.message) {
    return { message: err.message };
  }

  return {
    message: language === 'uz' ? 'Server xatoligi. Qaytadan urinib ko\'ring.' : language === 'ru' ? 'Ошибка сервера. Попробуйте еще раз.' : 'Server error. Please try again.'
  };
};

export default function ProductModal({
  isOpen,
  onClose,
  onSuccess,
  editingProduct,
  categories
}: ProductModalProps) {
  const { t, getLocalizedField, language } = useLanguage();

  const [formData, setFormData] = useState(initialFormData);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewingImage, setPreviewingImage] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFormRef = useRef(initialFormData);
  const initialImagesRef = useRef<ProductImage[]>([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSubmitAttempted(false);
      setFieldErrors({});
      setFormError(null);
      setSuccessMessage(null);
      setImageUrl('');
      setUrlError(null);

      if (editingProduct) {
        const editFormData = {
          name_uz: editingProduct.name_uz,
          name_ru: editingProduct.name_ru,
          name_en: editingProduct.name_en,
          description_uz: editingProduct.description_uz || '',
          description_ru: editingProduct.description_ru || '',
          description_en: editingProduct.description_en || '',
          price: editingProduct.price,
          original_price: editingProduct.original_price || 0,
          category_id: editingProduct.category_id || '',
          brand: editingProduct.brand || '',
          stock_quantity: editingProduct.stock_quantity,
          warranty_uz: editingProduct.warranty_uz || '',
          warranty_ru: editingProduct.warranty_ru || '',
          warranty_en: editingProduct.warranty_en || '',
          sku: editingProduct.sku || '',
          is_new: editingProduct.is_new,
          is_popular: editingProduct.is_popular,
          is_discount: editingProduct.is_discount,
        };
        setFormData(editFormData);
        initialFormRef.current = editFormData;

        const existingImages: ProductImage[] = (editingProduct.product_images || [])
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(img => ({
            id: img.id,
            url: img.image_url,
            is_primary: img.is_primary || false,
            source: 'url' as const,
          }));
        setProductImages(existingImages);
        initialImagesRef.current = existingImages;
      } else {
        setFormData(initialFormData);
        initialFormRef.current = initialFormData;
        setProductImages([]);
        initialImagesRef.current = [];
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, editingProduct]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, isSubmitting]);

  const validateForm = (): ValidationResult => {
    const errors: FieldError[] = [];

    if (!formData.name_uz.trim()) {
      errors.push({
        field: 'name_uz',
        message: language === 'uz' ? 'Nomi (UZ) majburiy' : language === 'ru' ? 'Название (UZ) обязательно' : 'Name (UZ) is required'
      });
    }

    if (!formData.name_ru.trim()) {
      errors.push({
        field: 'name_ru',
        message: language === 'uz' ? 'Nomi (RU) majburiy' : language === 'ru' ? 'Название (RU) обязательно' : 'Name (RU) is required'
      });
    }

    if (!formData.name_en.trim()) {
      errors.push({
        field: 'name_en',
        message: language === 'uz' ? 'Nomi (EN) majburiy' : language === 'ru' ? 'Название (EN) обязательно' : 'Name (EN) is required'
      });
    }

    if (formData.price <= 0) {
      errors.push({
        field: 'price',
        message: language === 'uz' ? 'Narx 0 dan katta bo\'lishi kerak' : language === 'ru' ? 'Цена должна быть больше 0' : 'Price must be greater than 0'
      });
    }

    if (formData.stock_quantity < 0) {
      errors.push({
        field: 'stock_quantity',
        message: language === 'uz' ? 'Ombor miqdori manfiy bo\'lishi mumkin emas' : language === 'ru' ? 'Количество на складе не может быть отрицательным' : 'Stock quantity cannot be negative'
      });
    }

    if (!Number.isInteger(formData.stock_quantity)) {
      errors.push({
        field: 'stock_quantity',
        message: language === 'uz' ? 'Ombor miqdori butun son bo\'lishi kerak' : language === 'ru' ? 'Количество на складе должно быть целым числом' : 'Stock quantity must be a whole number'
      });
    }

    if (productImages.length === 0) {
      errors.push({
        field: 'images',
        message: language === 'uz' ? 'Kamida 1 ta rasm qo\'shish kerak (URL yoki yuklash)' :
                 language === 'ru' ? 'Необходимо добавить минимум 1 изображение (URL или загрузка)' :
                 'Please add at least one product image (URL or upload)'
      });
    }

    if (formData.original_price && formData.original_price < formData.price) {
      errors.push({
        field: 'original_price',
        message: language === 'uz' ? 'Eski narx hozirgi narxdan past bo\'lishi mumkin emas' : language === 'ru' ? 'Старая цена не может быть меньше текущей' : 'Original price cannot be less than current price'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const hasFormChanged = () => {
    const formChanged = JSON.stringify(formData) !== JSON.stringify(initialFormRef.current);
    const imagesChanged = JSON.stringify(productImages) !== JSON.stringify(initialImagesRef.current);
    return formChanged || imagesChanged;
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
    cleanupAndClose();
  };

  const cleanupAndClose = () => {
    productImages.forEach(img => {
      if (img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });
    setFormData(initialFormData);
    setProductImages([]);
    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);
    setPreviewingImage(null);
    setSubmitAttempted(false);
    onClose();
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return language === 'uz'
        ? 'Faqat JPG, PNG va WEBP formatdagi rasmlar qo\'shish mumkin'
        : language === 'ru'
          ? 'Можно загружать только изображения JPG, PNG и WEBP'
          : 'Only JPG, PNG, and WEBP images are allowed';
    }

    if (file.size > MAX_FILE_SIZE) {
      return language === 'uz'
        ? 'Rasm hajmi 5MB dan oshmasligi kerak'
        : language === 'ru'
          ? 'Размер изображения не должен превышать 5MB'
          : 'Image size must not exceed 5MB';
    }

    return null;
  };

  const validateImageUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const checkImageLoads = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      setTimeout(() => resolve(false), 10000);
    });
  };

  const handleAddImageUrl = async () => {
    const trimmedUrl = imageUrl.trim();

    if (!trimmedUrl) {
      setUrlError(
        language === 'uz' ? 'URL manzilini kiriting' :
        language === 'ru' ? 'Введите URL адрес' :
        'Enter a URL'
      );
      return;
    }

    if (productImages.length >= MAX_IMAGES) {
      setUrlError(
        language === 'uz' ? `Maksimal ${MAX_IMAGES} ta rasm qo'shish mumkin` :
        language === 'ru' ? `Можно добавить максимум ${MAX_IMAGES} изображений` :
        `Maximum ${MAX_IMAGES} images allowed`
      );
      return;
    }

    if (!validateImageUrl(trimmedUrl)) {
      setUrlError(
        language === 'uz' ? 'Yaroqli URL manzilini kiriting (http:// yoki https://)' :
        language === 'ru' ? 'Введите действительный URL (http:// или https://)' :
        'Enter a valid URL (http:// or https://)'
      );
      return;
    }

    const isDuplicate = productImages.some(img => img.url === trimmedUrl);
    if (isDuplicate) {
      setUrlError(
        language === 'uz' ? 'Bu rasm allaqachon qo\'shilgan' :
        language === 'ru' ? 'Это изображение уже добавлено' :
        'This image is already added'
      );
      return;
    }

    setIsValidatingUrl(true);
    setUrlError(null);

    console.log('[ProductModal] Validating image URL:', trimmedUrl);

    const isValid = await checkImageLoads(trimmedUrl);

    if (!isValid) {
      setUrlError(
        language === 'uz' ? 'Bu URL manzilida rasm topilmadi' :
        language === 'ru' ? 'Изображение не найдено по этому URL' :
        'No image found at this URL'
      );
      setIsValidatingUrl(false);
      return;
    }

    console.log('[ProductModal] Image URL validated successfully');

    const isPrimary = productImages.length === 0;
    const newImage: ProductImage = {
      url: trimmedUrl,
      is_primary: isPrimary,
      source: 'url',
    };

    setProductImages([...productImages, newImage]);
    setImageUrl('');
    setUrlError(null);
    setIsValidatingUrl(false);
    setFieldErrors(prev => ({ ...prev, images: '' }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFieldErrors(prev => ({ ...prev, images: '' }));

    const remainingSlots = MAX_IMAGES - productImages.length;
    if (remainingSlots <= 0) {
      setFieldErrors(prev => ({
        ...prev,
        images: language === 'uz'
          ? `Maksimal ${MAX_IMAGES} ta rasm qo'shish mumkin`
          : language === 'ru'
            ? `Можно загрузить максимум ${MAX_IMAGES} изображений`
            : `Maximum ${MAX_IMAGES} images allowed`
      }));
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newImages: ProductImage[] = [];
    let hasError = false;

    for (const file of filesToProcess) {
      const validationError = validateFile(file);
      if (validationError) {
        setFieldErrors(prev => ({ ...prev, images: validationError }));
        hasError = true;
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const isPrimary = productImages.length === 0 && newImages.length === 0;

      newImages.push({
        url: previewUrl,
        file,
        is_primary: isPrimary,
        source: 'upload',
      });
    }

    if (newImages.length > 0) {
      setProductImages([...productImages, ...newImages]);
      if (!hasError) {
        setFieldErrors(prev => ({ ...prev, images: '' }));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const input = fileInputRef.current;
    if (input) {
      const dt = new DataTransfer();
      for (let i = 0; i < files.length; i++) {
        dt.items.add(files[i]);
      }
      input.files = dt.files;

      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemoveImage = (index: number) => {
    const imageToRemove = productImages[index];
    if (imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }

    const newImages = productImages.filter((_, i) => i !== index);
    if (newImages.length > 0 && !newImages.some(img => img.is_primary)) {
      newImages[0].is_primary = true;
    }
    setProductImages(newImages);
  };

  const handleSetPrimaryImage = (index: number) => {
    const newImages = productImages.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    setProductImages(newImages);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= productImages.length) return;

    const newImages = [...productImages];
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setProductImages(newImages);
  };

  const uploadImageToStorage = async (file: File, productId: string): Promise<{ url: string | null; error: string | null }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    console.log('[ProductModal] Uploading image:', { fileName, fileSize: file.size, fileType: file.type });

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[ProductModal] Storage upload error:', error);
      const errorMessage = language === 'uz'
        ? `Rasmni yuklashda xatolik: ${error.message}`
        : language === 'ru'
          ? `Ошибка загрузки изображения: ${error.message}`
          : `Image upload error: ${error.message}`;
      return { url: null, error: errorMessage };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    console.log('[ProductModal] Image uploaded successfully:', publicUrl);
    return { url: publicUrl, error: null };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    console.log('[ProductModal] Submit started', { formData, imageCount: productImages.length });

    const validation = validateForm();
    if (!validation.isValid) {
      console.log('[ProductModal] Validation failed:', validation.errors);

      const newFieldErrors: Record<string, string> = {};
      validation.errors.forEach(err => {
        newFieldErrors[err.field] = err.message;
      });
      setFieldErrors(newFieldErrors);

      const firstError = validation.errors[0];
      setFormError(firstError.message);
      return;
    }

    setIsSubmitting(true);
    setIsUploadingImage(productImages.some(img => img.file));

    try {
      const productData = {
        name_uz: formData.name_uz.trim(),
        name_ru: formData.name_ru.trim(),
        name_en: formData.name_en.trim(),
        description_uz: formData.description_uz.trim() || '',
        description_ru: formData.description_ru.trim() || '',
        description_en: formData.description_en.trim() || '',
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : null,
        category_id: formData.category_id || null,
        brand: formData.brand.trim() || null,
        stock_quantity: Math.floor(Number(formData.stock_quantity)),
        warranty_uz: formData.warranty_uz.trim() || '',
        warranty_ru: formData.warranty_ru.trim() || '',
        warranty_en: formData.warranty_en.trim() || '',
        sku: formData.sku.trim() || null,
        is_new: Boolean(formData.is_new),
        is_popular: Boolean(formData.is_popular),
        is_discount: Boolean(formData.is_discount),
      };

      console.log('[ProductModal] Product data prepared:', productData);

      let productId: string;

      if (editingProduct) {
        console.log('[ProductModal] Updating existing product:', editingProduct.id);

        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) {
          console.error('[ProductModal] Update error:', error);
          const parsedError = parseSupabaseError(error, language);
          if (parsedError.field) {
            setFieldErrors({ [parsedError.field]: parsedError.message });
          }
          throw new Error(parsedError.message);
        }

        productId = editingProduct.id;

        const { error: deleteImagesError } = await supabase
          .from('product_images')
          .delete()
          .eq('product_id', productId);

        if (deleteImagesError) {
          console.error('[ProductModal] Delete images error:', deleteImagesError);
        }
      } else {
        console.log('[ProductModal] Creating new product');

        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) {
          console.error('[ProductModal] Insert error:', error);
          const parsedError = parseSupabaseError(error, language);
          if (parsedError.field) {
            setFieldErrors({ [parsedError.field]: parsedError.message });
          }
          throw new Error(parsedError.message);
        }

        if (!newProduct) {
          throw new Error(language === 'uz' ? 'Mahsulot yaratilmadi' : language === 'ru' ? 'Продукт не создан' : 'Product was not created');
        }

        productId = newProduct.id;
        console.log('[ProductModal] Product created with ID:', productId);
      }

      const uploadedImages: Array<{ url: string; is_primary: boolean }> = [];
      const failedUploads: string[] = [];
      const urlBasedImages = productImages.filter(img => img.source === 'url' && !img.file);
      const fileBasedImages = productImages.filter(img => img.file);

      console.log('[ProductModal] Processing images:', {
        total: productImages.length,
        urlBased: urlBasedImages.length,
        fileBased: fileBasedImages.length
      });

      for (let i = 0; i < productImages.length; i++) {
        const img = productImages[i];
        let imageUrl = img.url;

        if (img.file) {
          setIsUploadingImage(true);
          console.log('[ProductModal] Uploading file image', i + 1, 'of', productImages.length, '- File:', img.file.name);

          const { url, error } = await uploadImageToStorage(img.file, productId);

          if (error || !url) {
            failedUploads.push(img.file.name);
            console.error('[ProductModal] Failed to upload image:', img.file.name, error);
            continue;
          }

          imageUrl = url;
          if (img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
          }
        } else {
          console.log('[ProductModal] Using URL image', i + 1, 'of', productImages.length, '- URL:', img.url.substring(0, 50) + '...');
        }

        uploadedImages.push({
          url: imageUrl,
          is_primary: img.is_primary,
        });
      }

      console.log('[ProductModal] Images processed:', {
        successful: uploadedImages.length,
        failed: failedUploads.length
      });

      if (uploadedImages.length > 0) {
        const imageInserts = uploadedImages.map((img, index) => ({
          product_id: productId,
          image_url: img.url,
          is_primary: img.is_primary,
          sort_order: index,
        }));

        console.log('[ProductModal] Inserting images into database:', imageInserts.length);

        const { error: imagesError } = await supabase.from('product_images').insert(imageInserts);

        if (imagesError) {
          console.error('[ProductModal] Insert images error:', imagesError);
        }
      }

      const allFileUploadsFailed = failedUploads.length > 0 && failedUploads.length === fileBasedImages.length;
      const noUrlImages = urlBasedImages.length === 0;

      if (allFileUploadsFailed && noUrlImages && !editingProduct) {
        console.log('[ProductModal] Rolling back product creation - all images failed and no URL images');
        await supabase.from('products').delete().eq('id', productId);
        throw new Error(
          language === 'uz'
            ? 'Barcha rasmlarni yuklashda xatolik. Mahsulot saqlanmadi.'
            : language === 'ru'
              ? 'Ошибка загрузки всех изображений. Продукт не сохранен.'
              : 'Failed to upload all images. Product was not saved.'
        );
      }

      if (failedUploads.length > 0 && uploadedImages.length > 0) {
        setSuccessMessage(
          language === 'uz'
            ? `Mahsulot saqlandi, lekin ba'zi rasmlar yuklanmadi: ${failedUploads.join(', ')}`
            : language === 'ru'
              ? `Продукт сохранен, но некоторые изображения не загружены: ${failedUploads.join(', ')}`
              : `Product saved, but some images failed to upload: ${failedUploads.join(', ')}`
        );
        setTimeout(() => {
          cleanupAndClose();
          onSuccess();
        }, 2000);
      } else {
        console.log('[ProductModal] Product saved successfully with', uploadedImages.length, 'images');
        cleanupAndClose();
        onSuccess();
      }
    } catch (error) {
      console.error('[ProductModal] Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const getFieldErrorClass = (fieldName: string) => {
    if (submitAttempted && fieldErrors[fieldName]) {
      return 'border-red-500 focus:border-red-500';
    }
    return 'border-gray-700 focus:border-orange-500';
  };

  const isFormValid = formData.name_uz.trim() && formData.name_ru.trim() && formData.name_en.trim() && formData.price > 0;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col"
              style={{
                width: 'min(90vw, 900px)',
                maxWidth: '900px',
                maxHeight: '90vh',
                margin: 'auto',
              }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-900 rounded-t-2xl flex-shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-orange-500" />
                  </div>
                  {editingProduct
                    ? (language === 'uz' ? 'Mahsulotni tahrirlash' : language === 'ru' ? 'Редактировать товар' : 'Edit Product')
                    : (language === 'uz' ? 'Yangi mahsulot' : language === 'ru' ? 'Новый товар' : 'New Product')
                  }
                </h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <section>
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center text-xs">1</span>
                      {language === 'uz' ? 'Asosiy ma\'lumotlar' : language === 'ru' ? 'Основная информация' : 'Basic Information'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Nomi (UZ)' : language === 'ru' ? 'Название (UZ)' : 'Name (UZ)'} *
                        </label>
                        <input
                          type="text"
                          value={formData.name_uz}
                          onChange={(e) => {
                            setFormData({ ...formData, name_uz: e.target.value });
                            if (fieldErrors.name_uz) setFieldErrors(prev => ({ ...prev, name_uz: '' }));
                          }}
                          className={`w-full px-4 py-2.5 bg-gray-800 border rounded-xl text-white focus:outline-none transition-colors ${getFieldErrorClass('name_uz')}`}
                        />
                        {fieldErrors.name_uz && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.name_uz}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Nomi (RU)' : language === 'ru' ? 'Название (RU)' : 'Name (RU)'} *
                        </label>
                        <input
                          type="text"
                          value={formData.name_ru}
                          onChange={(e) => {
                            setFormData({ ...formData, name_ru: e.target.value });
                            if (fieldErrors.name_ru) setFieldErrors(prev => ({ ...prev, name_ru: '' }));
                          }}
                          className={`w-full px-4 py-2.5 bg-gray-800 border rounded-xl text-white focus:outline-none transition-colors ${getFieldErrorClass('name_ru')}`}
                        />
                        {fieldErrors.name_ru && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.name_ru}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Nomi (EN)' : language === 'ru' ? 'Название (EN)' : 'Name (EN)'} *
                        </label>
                        <input
                          type="text"
                          value={formData.name_en}
                          onChange={(e) => {
                            setFormData({ ...formData, name_en: e.target.value });
                            if (fieldErrors.name_en) setFieldErrors(prev => ({ ...prev, name_en: '' }));
                          }}
                          className={`w-full px-4 py-2.5 bg-gray-800 border rounded-xl text-white focus:outline-none transition-colors ${getFieldErrorClass('name_en')}`}
                        />
                        {fieldErrors.name_en && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.name_en}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Tavsif (UZ)' : language === 'ru' ? 'Описание (UZ)' : 'Description (UZ)'}
                        </label>
                        <textarea
                          value={formData.description_uz}
                          onChange={(e) => setFormData({ ...formData, description_uz: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Tavsif (RU)' : language === 'ru' ? 'Описание (RU)' : 'Description (RU)'}
                        </label>
                        <textarea
                          value={formData.description_ru}
                          onChange={(e) => setFormData({ ...formData, description_ru: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Tavsif (EN)' : language === 'ru' ? 'Описание (EN)' : 'Description (EN)'}
                        </label>
                        <textarea
                          value={formData.description_en}
                          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors resize-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t.admin.productCategory}</label>
                        <select
                          value={formData.category_id}
                          onChange={(e) => {
                            setFormData({ ...formData, category_id: e.target.value });
                            if (fieldErrors.category_id) setFieldErrors(prev => ({ ...prev, category_id: '' }));
                          }}
                          className={`w-full px-4 py-2.5 bg-gray-800 border rounded-xl text-white focus:outline-none transition-colors ${getFieldErrorClass('category_id')}`}
                        >
                          <option value="">{language === 'uz' ? 'Tanlang' : language === 'ru' ? 'Выберите' : 'Select'}</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {getLocalizedField(cat, 'name')}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.category_id && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.category_id}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t.admin.productBrand}</label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                          placeholder="Samsung, Apple..."
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center text-xs">2</span>
                      {language === 'uz' ? 'Rasmlar' : language === 'ru' ? 'Изображения' : 'Images'}
                      {!editingProduct && <span className="text-red-400">*</span>}
                      <span className="text-gray-500 text-xs font-normal ml-2">
                        ({productImages.length}/{MAX_IMAGES})
                      </span>
                    </h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Link className="w-4 h-4" />
                            {language === 'uz' ? 'URL orqali qo\'shish' : language === 'ru' ? 'Добавить по URL' : 'Add via URL'}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={imageUrl}
                              onChange={(e) => {
                                setImageUrl(e.target.value);
                                setUrlError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddImageUrl();
                                }
                              }}
                              placeholder="https://example.com/image.jpg"
                              disabled={productImages.length >= MAX_IMAGES || isValidatingUrl}
                              className={`flex-1 px-4 py-2.5 bg-gray-800 border rounded-xl text-white focus:outline-none transition-colors ${
                                urlError ? 'border-red-500' : 'border-gray-700 focus:border-orange-500'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            />
                            <button
                              type="button"
                              onClick={handleAddImageUrl}
                              disabled={productImages.length >= MAX_IMAGES || isValidatingUrl || !imageUrl.trim()}
                              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                            >
                              {isValidatingUrl ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              {language === 'uz' ? 'Qo\'shish' : language === 'ru' ? 'Добавить' : 'Add'}
                            </button>
                          </div>
                          {urlError && (
                            <p className="text-red-400 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {urlError}
                            </p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Upload className="w-4 h-4" />
                            {language === 'uz' ? 'Fayldan yuklash' : language === 'ru' ? 'Загрузить файл' : 'Upload from file'}
                          </div>
                          <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => productImages.length < MAX_IMAGES && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                              productImages.length < MAX_IMAGES
                                ? 'border-gray-700 hover:border-orange-500 hover:bg-gray-800/50'
                                : 'border-gray-800 bg-gray-800/30 cursor-not-allowed'
                            }`}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              multiple
                              onChange={handleFileSelect}
                              className="hidden"
                              disabled={productImages.length >= MAX_IMAGES}
                            />
                            <Upload className={`w-8 h-8 mx-auto mb-1 ${productImages.length < MAX_IMAGES ? 'text-gray-500' : 'text-gray-700'}`} />
                            <p className={`text-sm ${productImages.length < MAX_IMAGES ? 'text-gray-300' : 'text-gray-600'}`}>
                              {productImages.length < MAX_IMAGES
                                ? (language === 'uz' ? 'Bosing yoki sudrab tashlang' : language === 'ru' ? 'Нажмите или перетащите' : 'Click or drag & drop')
                                : (language === 'uz' ? 'Maksimal songa yetildi' : language === 'ru' ? 'Достигнут максимум' : 'Maximum reached')
                              }
                            </p>
                            <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (max 5MB)</p>
                          </div>
                        </div>
                      </div>

                      {fieldErrors.images && (
                        <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {fieldErrors.images}
                        </div>
                      )}

                      {productImages.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">
                            {language === 'uz' ? 'Birinchi rasm asosiy rasm sifatida ko\'rsatiladi. Tartibni o\'zgartirish uchun rasmlarni suring.' :
                             language === 'ru' ? 'Первое изображение будет основным. Перетащите для изменения порядка.' :
                             'First image will be the main image. Drag to reorder.'}
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {productImages.map((img, index) => (
                              <div
                                key={`${img.url}-${index}`}
                                className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                                  img.is_primary ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-gray-700 hover:border-gray-600'
                                }`}
                              >
                                <div className="aspect-square bg-gray-800">
                                  <img
                                    src={img.url}
                                    alt={`Product ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400';
                                    }}
                                  />
                                </div>

                                <div className="absolute top-1 left-1 flex gap-1">
                                  {img.is_primary && (
                                    <div className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-medium rounded">
                                      {language === 'uz' ? 'Asosiy' : language === 'ru' ? 'Основное' : 'Primary'}
                                    </div>
                                  )}
                                  <div className={`px-1.5 py-0.5 text-white text-[10px] font-medium rounded ${
                                    img.source === 'url' ? 'bg-blue-500' : 'bg-green-500'
                                  }`}>
                                    {img.source === 'url' ? 'URL' : (language === 'uz' ? 'Fayl' : language === 'ru' ? 'Файл' : 'File')}
                                  </div>
                                </div>

                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewingImage(img.url)}
                                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                  >
                                    <Eye className="w-3 h-3 text-white" />
                                  </button>
                                  {!img.is_primary && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetPrimaryImage(index)}
                                      className="p-1.5 bg-orange-500/80 hover:bg-orange-500 rounded-lg transition-colors"
                                      title={language === 'uz' ? 'Asosiy qilish' : language === 'ru' ? 'Сделать основным' : 'Set as primary'}
                                    >
                                      <ImageIcon className="w-3 h-3 text-white" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </button>
                                </div>

                                <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {index > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveImage(index, 'up')}
                                      className="p-0.5 bg-gray-800/80 hover:bg-gray-700 rounded transition-colors"
                                    >
                                      <ChevronUp className="w-3 h-3 text-white" />
                                    </button>
                                  )}
                                  {index < productImages.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveImage(index, 'down')}
                                      className="p-0.5 bg-gray-800/80 hover:bg-gray-700 rounded transition-colors"
                                    >
                                      <ChevronDown className="w-3 h-3 text-white" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center text-xs">3</span>
                      {language === 'uz' ? 'Narx va ombor' : language === 'ru' ? 'Цена и склад' : 'Pricing & Inventory'}
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t.admin.productPrice} *</label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => {
                            setFormData({ ...formData, price: Number(e.target.value) });
                            if (fieldErrors.price) setFieldErrors(prev => ({ ...prev, price: '' }));
                          }}
                          min="0"
                          step="0.01"
                          className={`w-full px-4 py-2.5 bg-gray-800 border rounded-xl text-white focus:outline-none transition-colors ${getFieldErrorClass('price')}`}
                        />
                        {fieldErrors.price && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.price}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Eski narx' : language === 'ru' ? 'Старая цена' : 'Original Price'}
                        </label>
                        <input
                          type="number"
                          value={formData.original_price}
                          onChange={(e) => {
                            setFormData({ ...formData, original_price: Number(e.target.value) });
                            if (fieldErrors.original_price) setFieldErrors(prev => ({ ...prev, original_price: '' }));
                          }}
                          min="0"
                          step="0.01"
                          className={`w-full px-4 py-2.5 bg-gray-800 border rounded-xl text-white focus:outline-none transition-colors ${getFieldErrorClass('original_price')}`}
                        />
                        {fieldErrors.original_price && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.original_price}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {t.admin.productStock} *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={formData.stock_quantity}
                            onChange={(e) => {
                              setFormData({ ...formData, stock_quantity: Number(e.target.value) });
                              if (fieldErrors.stock_quantity) setFieldErrors(prev => ({ ...prev, stock_quantity: '' }));
                            }}
                            min="0"
                            step="1"
                            className={`w-full px-4 py-2.5 bg-gray-800 border rounded-xl text-white focus:outline-none transition-colors ${
                              fieldErrors.stock_quantity
                                ? 'border-red-500 focus:border-red-500'
                                : formData.stock_quantity === 0
                                  ? 'border-red-500 focus:border-red-500'
                                  : formData.stock_quantity <= LOW_STOCK_THRESHOLD
                                    ? 'border-yellow-500 focus:border-yellow-500'
                                    : 'border-gray-700 focus:border-orange-500'
                            }`}
                          />
                          {!fieldErrors.stock_quantity && formData.stock_quantity === 0 && (
                            <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                          )}
                          {!fieldErrors.stock_quantity && formData.stock_quantity > 0 && formData.stock_quantity <= LOW_STOCK_THRESHOLD && (
                            <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        {fieldErrors.stock_quantity && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.stock_quantity}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">SKU</label>
                        <input
                          type="text"
                          value={formData.sku}
                          onChange={(e) => {
                            setFormData({ ...formData, sku: e.target.value });
                            if (fieldErrors.sku) setFieldErrors(prev => ({ ...prev, sku: '' }));
                          }}
                          className={`w-full px-4 py-2.5 bg-gray-800 border rounded-xl text-white focus:outline-none transition-colors ${getFieldErrorClass('sku')}`}
                          placeholder="PRD-001"
                        />
                        {fieldErrors.sku && (
                          <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center text-xs">4</span>
                      {language === 'uz' ? 'Kafolat' : language === 'ru' ? 'Гарантия' : 'Warranty'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Kafolat (UZ)' : language === 'ru' ? 'Гарантия (UZ)' : 'Warranty (UZ)'}
                        </label>
                        <input
                          type="text"
                          value={formData.warranty_uz}
                          onChange={(e) => setFormData({ ...formData, warranty_uz: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                          placeholder="12 oy"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Kafolat (RU)' : language === 'ru' ? 'Гарантия (RU)' : 'Warranty (RU)'}
                        </label>
                        <input
                          type="text"
                          value={formData.warranty_ru}
                          onChange={(e) => setFormData({ ...formData, warranty_ru: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                          placeholder="12 месяцев"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {language === 'uz' ? 'Kafolat (EN)' : language === 'ru' ? 'Гарантия (EN)' : 'Warranty (EN)'}
                        </label>
                        <input
                          type="text"
                          value={formData.warranty_en}
                          onChange={(e) => setFormData({ ...formData, warranty_en: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                          placeholder="12 months"
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center text-xs">5</span>
                      {language === 'uz' ? 'Belgilar' : language === 'ru' ? 'Метки' : 'Labels'}
                    </h3>

                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.is_new}
                          onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-700"
                        />
                        <span className="text-gray-300 font-medium">{t.product.new}</span>
                      </label>
                      <label className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.is_popular}
                          onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-700"
                        />
                        <span className="text-gray-300 font-medium">{t.product.popular}</span>
                      </label>
                      <label className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.is_discount}
                          onChange={(e) => setFormData({ ...formData, is_discount: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-700"
                        />
                        <span className="text-gray-300 font-medium">{t.product.discount}</span>
                      </label>
                    </div>
                  </section>

                  {successMessage && (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <p className="text-green-400">{successMessage}</p>
                    </div>
                  )}

                  {formError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-medium">
                          {language === 'uz' ? 'Xatolik' : language === 'ru' ? 'Ошибка' : 'Error'}
                        </p>
                        <p className="text-red-400 text-sm mt-1">{formError}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                  >
                    {t.admin.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isUploadingImage
                          ? (language === 'uz' ? 'Rasmlar yuklanmoqda...' : language === 'ru' ? 'Загрузка изображений...' : 'Uploading images...')
                          : (language === 'uz' ? 'Saqlanmoqda...' : language === 'ru' ? 'Сохранение...' : 'Saving...')
                        }
                      </>
                    ) : editingProduct ? (
                      language === 'uz' ? 'Saqlash' : language === 'ru' ? 'Сохранить' : 'Save'
                    ) : (
                      language === 'uz' ? 'Yaratish' : language === 'ru' ? 'Создать' : 'Create'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>

          <AnimatePresence>
            {previewingImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPreviewingImage(null)}
                className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4"
              >
                <button
                  type="button"
                  onClick={() => setPreviewingImage(null)}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
                <motion.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  src={previewingImage}
                  alt="Preview"
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
