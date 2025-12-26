import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MessageSquare,
  Check,
  X,
  Edit2,
  Trash2,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Brain,
  FileText,
  HelpCircle,
  BarChart3,
  Save,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  getAIFAQs,
  getAIAnswerHistory,
  approveAIAnswer,
  createOrUpdateFAQ,
  deleteFAQ,
} from '../../services/chatService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type Tab = 'faq' | 'history' | 'analytics';

interface FAQ {
  id: string;
  question_patterns: string[];
  question_uz: string;
  question_ru: string;
  question_en: string;
  answer_uz: string;
  answer_ru: string;
  answer_en: string;
  category: string;
  priority: number;
  is_active: boolean;
}

interface AnswerHistory {
  id: string;
  session_id: string;
  user_message: string;
  ai_response: string;
  language: string;
  script: string | null;
  knowledge_sources: string[];
  is_approved: boolean;
  admin_edited_response: string | null;
  created_at: string;
}

export default function AIManagement() {
  const { language, getLocalizedField } = useLanguage();

  const [activeTab, setActiveTab] = useState<Tab>('faq');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [answerHistory, setAnswerHistory] = useState<AnswerHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);
  const [editedResponseText, setEditedResponseText] = useState('');
  const [saving, setSaving] = useState(false);

  const labels = {
    title: language === 'uz' ? 'AI Boshqaruvi' : language === 'ru' ? 'Управление AI' : 'AI Management',
    faq: language === 'uz' ? "Ko'p so'raladigan savollar" : language === 'ru' ? 'Часто задаваемые вопросы' : 'FAQ',
    history: language === 'uz' ? 'Javoblar tarixi' : language === 'ru' ? 'История ответов' : 'Answer History',
    analytics: language === 'uz' ? 'Statistika' : language === 'ru' ? 'Статистика' : 'Analytics',
    addFaq: language === 'uz' ? "FAQ qo'shish" : language === 'ru' ? 'Добавить FAQ' : 'Add FAQ',
    editFaq: language === 'uz' ? 'FAQ tahrirlash' : language === 'ru' ? 'Редактировать FAQ' : 'Edit FAQ',
    question: language === 'uz' ? 'Savol' : language === 'ru' ? 'Вопрос' : 'Question',
    answer: language === 'uz' ? 'Javob' : language === 'ru' ? 'Ответ' : 'Answer',
    patterns: language === 'uz' ? 'Kalit so\'zlar' : language === 'ru' ? 'Ключевые слова' : 'Keywords',
    priority: language === 'uz' ? 'Muhimlik' : language === 'ru' ? 'Приоритет' : 'Priority',
    category: language === 'uz' ? 'Kategoriya' : language === 'ru' ? 'Категория' : 'Category',
    save: language === 'uz' ? 'Saqlash' : language === 'ru' ? 'Сохранить' : 'Save',
    cancel: language === 'uz' ? 'Bekor qilish' : language === 'ru' ? 'Отмена' : 'Cancel',
    approve: language === 'uz' ? 'Tasdiqlash' : language === 'ru' ? 'Подтвердить' : 'Approve',
    edit: language === 'uz' ? 'Tahrirlash' : language === 'ru' ? 'Редактировать' : 'Edit',
    delete: language === 'uz' ? "O'chirish" : language === 'ru' ? 'Удалить' : 'Delete',
    search: language === 'uz' ? 'Qidirish...' : language === 'ru' ? 'Поиск...' : 'Search...',
    noResults: language === 'uz' ? 'Natijalar topilmadi' : language === 'ru' ? 'Результаты не найдены' : 'No results found',
    userMessage: language === 'uz' ? 'Foydalanuvchi xabari' : language === 'ru' ? 'Сообщение пользователя' : 'User Message',
    aiResponse: language === 'uz' ? 'AI javobi' : language === 'ru' ? 'Ответ AI' : 'AI Response',
    approved: language === 'uz' ? 'Tasdiqlangan' : language === 'ru' ? 'Подтверждено' : 'Approved',
    pending: language === 'uz' ? 'Kutilmoqda' : language === 'ru' ? 'Ожидание' : 'Pending',
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'faq') {
      const data = await getAIFAQs();
      setFaqs(data);
    } else if (activeTab === 'history') {
      const data = await getAIAnswerHistory(100);
      setAnswerHistory(data);
    }
    setLoading(false);
  };

  const handleSaveFAQ = async (faqData: Partial<FAQ>) => {
    setSaving(true);
    await createOrUpdateFAQ({
      ...faqData,
      question_patterns: faqData.question_patterns || [],
      question_uz: faqData.question_uz || '',
      question_ru: faqData.question_ru || '',
      question_en: faqData.question_en || '',
      answer_uz: faqData.answer_uz || '',
      answer_ru: faqData.answer_ru || '',
      answer_en: faqData.answer_en || '',
    });
    setSaving(false);
    setShowFAQModal(false);
    setEditingFAQ(null);
    loadData();
  };

  const handleDeleteFAQ = async (faqId: string) => {
    if (!confirm(language === 'uz' ? "O'chirishni tasdiqlaysizmi?" : language === 'ru' ? 'Подтвердите удаление' : 'Confirm deletion')) return;
    await deleteFAQ(faqId);
    loadData();
  };

  const handleApproveAnswer = async (answerId: string, editedResponse?: string) => {
    await approveAIAnswer(answerId, editedResponse);
    setEditingAnswer(null);
    setEditedResponseText('');
    loadData();
  };

  const filteredFaqs = faqs.filter((faq) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      faq.question_uz.toLowerCase().includes(query) ||
      faq.question_ru.toLowerCase().includes(query) ||
      faq.question_en.toLowerCase().includes(query) ||
      faq.answer_uz.toLowerCase().includes(query) ||
      faq.category.toLowerCase().includes(query)
    );
  });

  const filteredHistory = answerHistory.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.user_message.toLowerCase().includes(query) ||
      item.ai_response.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{labels.title}</h1>
            <p className="text-gray-400 text-sm">
              {language === 'uz' ? "AI bilimlar bazasini boshqarish" : language === 'ru' ? 'Управление базой знаний AI' : 'Manage AI knowledge base'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-700 pb-4">
        {([
          { id: 'faq', label: labels.faq, icon: HelpCircle },
          { id: 'history', label: labels.history, icon: MessageSquare },
          { id: 'analytics', label: labels.analytics, icon: BarChart3 },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={labels.search}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        {activeTab === 'faq' && (
          <button
            onClick={() => {
              setEditingFAQ(null);
              setShowFAQModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {labels.addFaq}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>{labels.noResults}</p>
                </div>
              ) : (
                filteredFaqs.map((faq) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                            {faq.category}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">
                            {language === 'uz' ? 'Muhimlik' : 'Priority'}: {faq.priority}
                          </span>
                        </div>
                        <h3 className="text-white font-medium mb-2">
                          {getLocalizedField(faq, 'question')}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {getLocalizedField(faq, 'answer')}
                        </p>
                        {faq.question_patterns.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {faq.question_patterns.map((pattern, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                                {pattern}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingFAQ(faq);
                            setShowFAQModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFAQ(faq.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>{labels.noResults}</p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            item.is_approved
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {item.is_approved ? labels.approved : labels.pending}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full uppercase">
                            {item.language} {item.script && `(${item.script})`}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="bg-gray-900 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">{labels.userMessage}:</p>
                          <p className="text-gray-300">{item.user_message}</p>
                        </div>

                        {editingAnswer === item.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editedResponseText}
                              onChange={(e) => setEditedResponseText(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white resize-none focus:outline-none focus:border-blue-500"
                              rows={4}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveAnswer(item.id, editedResponseText)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                              >
                                <Save className="w-4 h-4" />
                                {labels.save}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingAnswer(null);
                                  setEditedResponseText('');
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                              >
                                {labels.cancel}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                            <p className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {labels.aiResponse}:
                            </p>
                            <p className="text-gray-300 whitespace-pre-wrap">
                              {item.admin_edited_response || item.ai_response}
                            </p>
                          </div>
                        )}
                      </div>

                      {!item.is_approved && editingAnswer !== item.id && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleApproveAnswer(item.id)}
                            className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg transition-colors"
                            title={labels.approve}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingAnswer(item.id);
                              setEditedResponseText(item.ai_response);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                            title={labels.edit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">
                      {language === 'uz' ? 'Jami AI chatlar' : language === 'ru' ? 'Всего AI чатов' : 'Total AI Chats'}
                    </p>
                    <p className="text-2xl font-bold text-white">{answerHistory.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">
                      {language === 'uz' ? 'Tasdiqlangan' : language === 'ru' ? 'Подтверждено' : 'Approved'}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {answerHistory.filter(a => a.is_approved).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">
                      {language === 'uz' ? 'FAQ soni' : language === 'ru' ? 'Количество FAQ' : 'Total FAQs'}
                    </p>
                    <p className="text-2xl font-bold text-white">{faqs.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showFAQModal && (
          <FAQModal
            faq={editingFAQ}
            labels={labels}
            language={language}
            saving={saving}
            onSave={handleSaveFAQ}
            onClose={() => {
              setShowFAQModal(false);
              setEditingFAQ(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface FAQModalProps {
  faq: FAQ | null;
  labels: Record<string, string>;
  language: string;
  saving: boolean;
  onSave: (data: Partial<FAQ>) => void;
  onClose: () => void;
}

function FAQModal({ faq, labels, language, saving, onSave, onClose }: FAQModalProps) {
  const [formData, setFormData] = useState({
    id: faq?.id,
    question_patterns: faq?.question_patterns?.join(', ') || '',
    question_uz: faq?.question_uz || '',
    question_ru: faq?.question_ru || '',
    question_en: faq?.question_en || '',
    answer_uz: faq?.answer_uz || '',
    answer_ru: faq?.answer_ru || '',
    answer_en: faq?.answer_en || '',
    category: faq?.category || 'general',
    priority: faq?.priority || 50,
    is_active: faq?.is_active ?? true,
  });

  const handleSubmit = () => {
    onSave({
      ...formData,
      question_patterns: formData.question_patterns.split(',').map(p => p.trim()).filter(Boolean),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {faq ? labels.editFaq : labels.addFaq}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">{labels.patterns}</label>
            <input
              type="text"
              value={formData.question_patterns}
              onChange={(e) => setFormData({ ...formData, question_patterns: e.target.value })}
              placeholder="kafolat, гарантия, warranty"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {language === 'uz' ? "Vergul bilan ajrating" : "Separate with commas"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">{labels.category}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="general">General</option>
                <option value="delivery">Delivery</option>
                <option value="warranty">Warranty</option>
                <option value="payment">Payment</option>
                <option value="returns">Returns</option>
                <option value="store">Store</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">{labels.priority}</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-medium">{labels.question}</h3>
            <input
              type="text"
              value={formData.question_uz}
              onChange={(e) => setFormData({ ...formData, question_uz: e.target.value })}
              placeholder="O'zbekcha savol"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={formData.question_ru}
              onChange={(e) => setFormData({ ...formData, question_ru: e.target.value })}
              placeholder="Вопрос на русском"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={formData.question_en}
              onChange={(e) => setFormData({ ...formData, question_en: e.target.value })}
              placeholder="Question in English"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-medium">{labels.answer}</h3>
            <textarea
              value={formData.answer_uz}
              onChange={(e) => setFormData({ ...formData, answer_uz: e.target.value })}
              placeholder="O'zbekcha javob"
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
            />
            <textarea
              value={formData.answer_ru}
              onChange={(e) => setFormData({ ...formData, answer_ru: e.target.value })}
              placeholder="Ответ на русском"
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
            />
            <textarea
              value={formData.answer_en}
              onChange={(e) => setFormData({ ...formData, answer_en: e.target.value })}
              placeholder="Answer in English"
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            {labels.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {labels.save}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
