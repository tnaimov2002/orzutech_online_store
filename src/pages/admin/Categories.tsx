import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus, Edit, Trash2, X, FolderTree, ChevronRight, ChevronDown,
  GripVertical, Eye, EyeOff, AlertTriangle, Package, Search,
  ImageIcon, History, Loader2
} from 'lucide-react';
import { Category, CategoryAuditLog } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminModal from '../../components/admin/AdminModal';
import { categoryIcons, iconCategories, getIconByName, getSemanticIcon, suggestIconForCategory } from '../../utils/categoryIcons';

interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

const initialFormData = {
  name_uz: '',
  name_ru: '',
  name_en: '',
  parent_id: '',
  image_url: '',
  icon: '',
  status: 'active' as 'active' | 'hidden',
  sort_order: 0,
  description: '',
  show_in_header: false,
};

export default function Categories() {
  const { t, getLocalizedField, language } = useLanguage();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [auditLogs, setAuditLogs] = useState<CategoryAuditLog[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const initialFormRef = useRef(initialFormData);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [selectedIconCategory, setSelectedIconCategory] = useState<string>('Electronics');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isDeleteModalOpen]);

  useEffect(() => {
    if (isAuditModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isAuditModalOpen]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('level')
      .order('sort_order');

    if (data) {
      setCategories(data);
      buildCategoryTree(data);
      fetchProductCounts(data.map(c => c.id));
    }
    setLoading(false);
  }, []);

  const fetchProductCounts = async (categoryIds: string[]) => {
    const counts: Record<string, number> = {};
    for (const id of categoryIds) {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);
      counts[id] = count || 0;
    }
    setProductCounts(counts);
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from('category_audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(50);

    if (data) setAuditLogs(data);
  };

  const buildCategoryTree = (flatCategories: Category[]) => {
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    flatCategories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    flatCategories.forEach(cat => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        categoryMap.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    roots.forEach(root => sortChildren(root));
    setCategoryTree(roots);
  };

  const sortChildren = (node: CategoryTreeNode) => {
    node.children.sort((a, b) => a.sort_order - b.sort_order);
    node.children.forEach(sortChildren);
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const logAuditAction = async (
    categoryId: string | null,
    action: 'create' | 'update' | 'delete' | 'move',
    oldData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null
  ) => {
    await supabase.from('category_audit_log').insert({
      category_id: categoryId,
      action,
      old_data: oldData,
      new_data: newData,
      changed_by: 'Admin',
      user_agent: navigator.userAgent,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const isFormValid = formData.name_uz.trim() && formData.name_ru.trim() && formData.name_en.trim();

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
      const categoryData = {
        name_uz: formData.name_uz,
        name_ru: formData.name_ru,
        name_en: formData.name_en,
        parent_id: formData.parent_id || null,
        image_url: formData.image_url || null,
        icon: formData.icon || null,
        status: formData.status,
        sort_order: formData.sort_order,
        description: formData.description || null,
        slug: generateSlug(formData.name_en),
        show_in_header: formData.show_in_header,
      };

      if (editingCategory) {
        await logAuditAction(editingCategory.id, 'update', editingCategory as unknown as Record<string, unknown>, categoryData);
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { data: newCat, error } = await supabase
          .from('categories')
          .insert(categoryData)
          .select()
          .single();
        if (error) throw error;
        if (newCat) {
          await logAuditAction(newCat.id, 'create', null, categoryData);
        }
      }

      setIsModalOpen(false);
      resetForm();
      fetchCategories();
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

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    const editFormData = {
      name_uz: category.name_uz,
      name_ru: category.name_ru,
      name_en: category.name_en,
      parent_id: category.parent_id || '',
      image_url: category.image_url || '',
      icon: category.icon || '',
      status: category.status,
      sort_order: category.sort_order,
      description: category.description || '',
      show_in_header: category.show_in_header || false,
    };
    setFormData(editFormData);
    initialFormRef.current = editFormData;
    setFormError(null);
    setIsIconPickerOpen(false);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;

    setIsDeleting(true);
    try {
      const children = categories.filter(c => c.parent_id === deletingCategory.id);

      if (children.length > 0) {
        await supabase
          .from('categories')
          .update({ parent_id: deletingCategory.parent_id })
          .eq('parent_id', deletingCategory.id);
      }

      await logAuditAction(deletingCategory.id, 'delete', deletingCategory as unknown as Record<string, unknown>, null);
      await supabase.from('categories').delete().eq('id', deletingCategory.id);

      setIsDeleteModalOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReorder = async (parentId: string | null, reorderedIds: string[]) => {
    for (let i = 0; i < reorderedIds.length; i++) {
      await supabase
        .from('categories')
        .update({ sort_order: i })
        .eq('id', reorderedIds[i]);
    }
    fetchCategories();
  };

  const toggleStatus = async (category: Category) => {
    const newStatus = category.status === 'active' ? 'hidden' : 'active';
    await logAuditAction(category.id, 'update', { status: category.status }, { status: newStatus });
    await supabase
      .from('categories')
      .update({ status: newStatus })
      .eq('id', category.id);
    fetchCategories();
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = categories.filter(c =>
      categories.some(child => child.parent_id === c.id)
    ).map(c => c.id);
    setExpandedCategories(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData(initialFormData);
    initialFormRef.current = initialFormData;
    setFormError(null);
    setIsIconPickerOpen(false);
    setIconSearchQuery('');
    setSelectedIconCategory('Electronics');
  };

  const filteredIcons = categoryIcons.filter(icon => {
    const matchesSearch = iconSearchQuery === '' || icon.name.toLowerCase().includes(iconSearchQuery.toLowerCase());
    const matchesCategory = selectedIconCategory === '' || icon.category === selectedIconCategory;
    return matchesSearch && matchesCategory;
  });

  const getAvailableParents = (excludeId?: string): Category[] => {
    if (!excludeId) return categories;

    const getDescendantIds = (parentId: string): string[] => {
      const children = categories.filter(c => c.parent_id === parentId);
      return [parentId, ...children.flatMap(c => getDescendantIds(c.id))];
    };

    const excludeIds = getDescendantIds(excludeId);
    return categories.filter(c => !excludeIds.includes(c.id));
  };

  const filteredTree = searchQuery
    ? categoryTree.filter(cat => {
        const matchesSearch = (c: CategoryTreeNode): boolean => {
          const name = getLocalizedField(c, 'name').toLowerCase();
          if (name.includes(searchQuery.toLowerCase())) return true;
          return c.children.some(matchesSearch);
        };
        return matchesSearch(cat);
      })
    : categoryTree;

  const renderCategoryNode = (node: CategoryTreeNode, depth: number = 0) => {
    const isExpanded = expandedCategories.has(node.id);
    const hasChildren = node.children.length > 0;
    const productCount = productCounts[node.id] || 0;

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="select-none"
      >
        <div
          className={`flex items-center justify-between p-3 rounded-xl transition-all ${
            depth === 0 ? 'bg-gray-800/70' : 'bg-gray-800/30'
          } hover:bg-gray-700/50 border border-gray-700/30 ${
            node.status === 'hidden' ? 'opacity-60' : ''
          }`}
          style={{ marginLeft: depth * 24 }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="cursor-grab text-gray-500 hover:text-gray-300">
              <GripVertical className="w-4 h-4" />
            </div>

            {hasChildren ? (
              <button
                onClick={() => toggleExpanded(node.id)}
                className="p-1 hover:bg-gray-600 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-orange-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}

            {(() => {
              const categoryName = `${node.name_en} ${node.name_uz} ${node.name_ru}`;
              const IconComponent = getSemanticIcon(node.icon, categoryName);
              const hasCustomIcon = node.icon && getIconByName(node.icon);
              return (
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  hasCustomIcon
                    ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30'
                    : 'bg-gray-700/50 border border-gray-600/30'
                }`}>
                  <IconComponent className={`w-5 h-5 ${hasCustomIcon ? 'text-orange-500' : 'text-orange-400/80'}`} />
                </div>
              );
            })()}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-white truncate">
                  {getLocalizedField(node, 'name')}
                </h3>
                {node.show_in_header && !node.parent_id && (
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                    {language === 'uz' ? 'Sarlavhada' : language === 'ru' ? 'В шапке' : 'In Header'}
                  </span>
                )}
                {node.status === 'hidden' && (
                  <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">
                    {language === 'uz' ? 'Yashirin' : language === 'ru' ? 'Скрыто' : 'Hidden'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {productCount} {language === 'uz' ? 'mahsulot' : language === 'ru' ? 'товаров' : 'products'}
                </span>
                {hasChildren && (
                  <span className="flex items-center gap-1">
                    <FolderTree className="w-3 h-3" />
                    {node.children.length} {language === 'uz' ? 'kichik kategoriya' : language === 'ru' ? 'подкатегорий' : 'subcategories'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleStatus(node)}
              className={`p-2 rounded-lg transition-colors ${
                node.status === 'active'
                  ? 'text-green-400 hover:bg-green-500/10'
                  : 'text-gray-500 hover:bg-gray-600'
              }`}
              title={node.status === 'active' ? 'Hide' : 'Show'}
            >
              {node.status === 'active' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                resetForm();
                const newFormData = { ...initialFormData, parent_id: node.id };
                setFormData(newFormData);
                initialFormRef.current = newFormData;
                setIsModalOpen(true);
              }}
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
              title="Add subcategory"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleEdit(node)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteClick(node)}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1 space-y-1"
            >
              <Reorder.Group
                axis="y"
                values={node.children.map(c => c.id)}
                onReorder={(ids) => handleReorder(node.id, ids)}
              >
                {node.children.map(child => (
                  <Reorder.Item key={child.id} value={child.id}>
                    {renderCategoryNode(child, depth + 1)}
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderParentSelector = (categories: Category[], excludeId?: string) => {
    const availableParents = getAvailableParents(excludeId);
    const rootCategories = availableParents.filter(c => !c.parent_id);

    const renderOption = (cat: Category, level: number): React.ReactNode => {
      const children = availableParents.filter(c => c.parent_id === cat.id);
      const prefix = '\u00A0\u00A0\u00A0\u00A0'.repeat(level);
      const arrow = level > 0 ? '└─ ' : '';

      return (
        <React.Fragment key={cat.id}>
          <option value={cat.id}>
            {prefix}{arrow}{getLocalizedField(cat, 'name')}
          </option>
          {children.map(child => renderOption(child, level + 1))}
        </React.Fragment>
      );
    };

    return rootCategories.map(cat => renderOption(cat, 0));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.admin.categories}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {categories.length} {language === 'uz' ? 'kategoriya' : language === 'ru' ? 'категорий' : 'categories'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchAuditLogs();
              setIsAuditModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'uz' ? 'Tarix' : language === 'ru' ? 'История' : 'History'}
            </span>
          </button>
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
            {t.admin.addCategory}
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'uz' ? 'Kategoriyalarni qidirish...' : language === 'ru' ? 'Поиск категорий...' : 'Search categories...'}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors text-sm"
          >
            {language === 'uz' ? 'Hammasi ochiq' : language === 'ru' ? 'Раскрыть все' : 'Expand All'}
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors text-sm"
          >
            {language === 'uz' ? 'Hammasi yopiq' : language === 'ru' ? 'Свернуть все' : 'Collapse All'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16">
          <FolderTree className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">
            {language === 'uz' ? 'Kategoriyalar topilmadi' : language === 'ru' ? 'Категории не найдены' : 'No categories found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Reorder.Group
            axis="y"
            values={filteredTree.map(c => c.id)}
            onReorder={(ids) => handleReorder(null, ids)}
          >
            {filteredTree.map(category => (
              <Reorder.Item key={category.id} value={category.id}>
                {renderCategoryNode(category)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}

      <AdminModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={editingCategory ? t.admin.edit : t.admin.addCategory}
        icon={<FolderTree className="w-5 h-5 text-orange-500" />}
        isSubmitting={isSubmitting}
        isFormValid={isFormValid}
        isEditing={!!editingCategory}
        size="md"
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {language === 'uz' ? 'Nomi (UZ)' : language === 'ru' ? 'Название (UZ)' : 'Name (UZ)'} *
            </label>
            <input
              type="text"
              value={formData.name_uz}
              onChange={(e) => setFormData({ ...formData, name_uz: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {language === 'uz' ? 'Nomi (RU)' : language === 'ru' ? 'Название (RU)' : 'Name (RU)'} *
            </label>
            <input
              type="text"
              value={formData.name_ru}
              onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {language === 'uz' ? 'Nomi (EN)' : language === 'ru' ? 'Название (EN)' : 'Name (EN)'} *
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Ota kategoriya' : language === 'ru' ? 'Родительская категория' : 'Parent Category'}
          </label>
          <select
            value={formData.parent_id}
            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          >
            <option value="">
              {language === 'uz' ? 'Asosiy kategoriya' : language === 'ru' ? 'Основная категория' : 'Top Level'}
            </option>
            {renderParentSelector(categories, editingCategory?.id)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Ikonka' : language === 'ru' ? 'Иконка' : 'Icon'}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {formData.icon ? (
                  <>
                    {(() => {
                      const IconComponent = getIconByName(formData.icon);
                      return IconComponent ? (
                        <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-4 h-4 text-orange-500" />
                        </div>
                      ) : null;
                    })()}
                    <span className="text-gray-300">{formData.icon}</span>
                  </>
                ) : (
                  <span className="text-gray-500">
                    {language === 'uz' ? 'Ikonkani tanlang' : language === 'ru' ? 'Выберите иконку' : 'Select an icon'}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isIconPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {formData.icon && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, icon: '' })}
                className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <AnimatePresence>
              {isIconPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl z-50 shadow-xl overflow-hidden"
                >
                  {(formData.name_en || formData.name_uz || formData.name_ru) && (
                    <div className="p-3 border-b border-gray-700 bg-orange-500/10">
                      <p className="text-xs text-orange-400 mb-2 font-medium">
                        {language === 'uz' ? 'Tavsiya qilingan ikonka:' : language === 'ru' ? 'Рекомендуемая иконка:' : 'Suggested icon:'}
                      </p>
                      {(() => {
                        const categoryName = `${formData.name_en} ${formData.name_uz} ${formData.name_ru}`;
                        const suggestedIconName = suggestIconForCategory(categoryName);
                        const SuggestedIcon = getIconByName(suggestedIconName);
                        if (SuggestedIcon) {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, icon: suggestedIconName });
                                setIsIconPickerOpen(false);
                              }}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full ${
                                formData.icon === suggestedIconName
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                              }`}
                            >
                              <SuggestedIcon className="w-5 h-5" />
                              <span className="text-sm font-medium">{suggestedIconName}</span>
                              <span className="text-xs opacity-70 ml-auto">
                                {language === 'uz' ? 'Bosing qo\'llash uchun' : language === 'ru' ? 'Нажмите для применения' : 'Click to apply'}
                              </span>
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  <div className="p-3 border-b border-gray-700">
                    <input
                      type="text"
                      value={iconSearchQuery}
                      onChange={(e) => setIconSearchQuery(e.target.value)}
                      placeholder={language === 'uz' ? 'Ikonkalarni qidirish...' : language === 'ru' ? 'Поиск иконок...' : 'Search icons...'}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="p-2 border-b border-gray-700 flex flex-wrap gap-1">
                    {iconCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedIconCategory(selectedIconCategory === cat ? '' : cat)}
                        className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                          selectedIconCategory === cat
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="p-3 grid grid-cols-8 gap-2 max-h-[200px] overflow-y-auto">
                    {filteredIcons.map(iconOption => {
                      const IconComp = iconOption.icon;
                      return (
                        <button
                          key={iconOption.name}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, icon: iconOption.name });
                            setIsIconPickerOpen(false);
                          }}
                          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            formData.icon === iconOption.name
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-orange-500'
                          }`}
                          title={iconOption.name}
                        >
                          <IconComp className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            <ImageIcon className="w-4 h-4 inline mr-1" />
            {language === 'uz' ? 'Rasm URL' : language === 'ru' ? 'URL изображения' : 'Image URL'}
          </label>
          <input
            type="url"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
          />
          {formData.image_url && (
            <div className="mt-2">
              <img
                src={formData.image_url}
                alt="Preview"
                className="w-16 h-16 rounded-lg object-cover bg-gray-700"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {language === 'uz' ? 'Tavsif' : language === 'ru' ? 'Описание' : 'Description'}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {language === 'uz' ? 'Holat' : language === 'ru' ? 'Статус' : 'Status'}
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'hidden' })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            >
              <option value="active">
                {language === 'uz' ? 'Faol' : language === 'ru' ? 'Активно' : 'Active'}
              </option>
              <option value="hidden">
                {language === 'uz' ? 'Yashirin' : language === 'ru' ? 'Скрыто' : 'Hidden'}
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {language === 'uz' ? 'Tartib' : language === 'ru' ? 'Порядок' : 'Sort Order'}
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {!formData.parent_id && (
          <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={formData.show_in_header}
                onChange={(e) => setFormData({ ...formData, show_in_header: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-800"
              />
              <div>
                <span className="text-white font-medium">
                  {language === 'uz' ? 'Sarlavhada ko\'rsatish' : language === 'ru' ? 'Показать в шапке' : 'Show in Header'}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">
                  {language === 'uz' ? 'Bu kategoriya sayt sarlavhasida navigatsiya sifatida ko\'rinadi' : language === 'ru' ? 'Эта категория будет отображаться в навигации сайта' : 'This category will appear in the site navigation'}
                </p>
              </div>
            </label>
          </div>
        )}

        {formError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{formError}</p>
          </div>
        )}
      </AdminModal>

      <AnimatePresence>
        {isDeleteModalOpen && deletingCategory && (
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
                        {language === 'uz' ? "Kategoriyani o'chirish" : language === 'ru' ? 'Удалить категорию' : 'Delete Category'}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {getLocalizedField(deletingCategory, 'name')}
                      </p>
                    </div>
                  </div>

                  {categories.filter(c => c.parent_id === deletingCategory.id).length > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4">
                      <p className="text-orange-400 text-sm">
                        {language === 'uz'
                          ? "Bu kategoriyaning ichki kategoriyalari mavjud. Ular asosiy kategoriyaga ko'chiriladi."
                          : language === 'ru'
                          ? 'Эта категория имеет подкатегории. Они будут перемещены в родительскую категорию.'
                          : 'This category has subcategories. They will be moved to the parent category.'}
                      </p>
                    </div>
                  )}

                  {productCounts[deletingCategory.id] > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                      <p className="text-yellow-400 text-sm">
                        {language === 'uz'
                          ? `Bu kategoriyada ${productCounts[deletingCategory.id]} ta mahsulot bor.`
                          : language === 'ru'
                          ? `В этой категории ${productCounts[deletingCategory.id]} товаров.`
                          : `This category has ${productCounts[deletingCategory.id]} products.`}
                      </p>
                    </div>
                  )}

                  <p className="text-gray-400 mb-6">
                    {language === 'uz'
                      ? "Bu amalni qaytarib bo'lmaydi. Davom etasizmi?"
                      : language === 'ru'
                      ? 'Это действие необратимо. Продолжить?'
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

      <AnimatePresence>
        {isAuditModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuditModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 flex flex-col"
                style={{ maxHeight: '90vh' }}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                      <History className="w-5 h-5 text-orange-500" />
                    </div>
                    {language === 'uz' ? 'Kategoriya tarixi' : language === 'ru' ? 'История категорий' : 'Category History'}
                  </h2>
                  <button
                    onClick={() => setIsAuditModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  {auditLogs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      {language === 'uz' ? 'Tarix mavjud emas' : language === 'ru' ? 'История пуста' : 'No history available'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-gray-800/50 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                log.action === 'create' ? 'bg-green-500/20 text-green-400' :
                                log.action === 'update' ? 'bg-blue-500/20 text-blue-400' :
                                log.action === 'delete' ? 'bg-red-500/20 text-red-400' :
                                'bg-orange-500/20 text-orange-400'
                              }`}>
                                {log.action.toUpperCase()}
                              </span>
                              <span className="text-gray-400 text-sm">
                                {log.changed_by || 'System'}
                              </span>
                            </div>
                            <span className="text-gray-500 text-xs">
                              {new Date(log.changed_at).toLocaleString()}
                            </span>
                          </div>
                          {log.new_data && (
                            <p className="text-gray-300 text-sm">
                              {(log.new_data as Record<string, unknown>).name_en ||
                               (log.new_data as Record<string, unknown>).name_uz ||
                               'Category'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
