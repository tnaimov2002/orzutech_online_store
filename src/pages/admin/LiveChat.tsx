import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  User,
  Clock,
  Check,
  CheckCheck,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Package,
  X,
  Zap,
  ShoppingBag,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatPrice } from '../../utils/format';
import {
  ChatSession,
  ChatMessage,
  QuickReply,
  getAllSessions,
  getSessionMessages,
  sendMessage,
  markMessagesAsRead,
  updateSessionInfo,
  closeSession,
  getQuickReplies,
  subscribeToMessages,
  subscribeToSessions,
} from '../../services/chatService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type FilterStatus = 'all' | 'active' | 'waiting' | 'closed';

export default function LiveChat() {
  const { language, getLocalizedField } = useLanguage();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
    loadQuickReplies();
  }, [filterStatus]);

  useEffect(() => {
    const unsubscribe = subscribeToSessions((session) => {
      setSessions((prev) => {
        const index = prev.findIndex((s) => s.id === session.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = session;
          return updated.sort((a, b) =>
            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          );
        }
        return [session, ...prev];
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedSession) return;

    const unsubscribe = subscribeToMessages(selectedSession.id, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    return unsubscribe;
  }, [selectedSession]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadSessions = async () => {
    setLoading(true);
    const status = filterStatus === 'all' ? undefined : filterStatus;
    const data = await getAllSessions(status);
    setSessions(data);
    setLoading(false);
  };

  const loadQuickReplies = async () => {
    const data = await getQuickReplies();
    setQuickReplies(data);
  };

  const selectSession = async (session: ChatSession) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    const msgs = await getSessionMessages(session.id);
    setMessages(msgs);
    await markMessagesAsRead(session.id, 'operator');
    setLoadingMessages(false);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedSession) return;

    await sendMessage(
      selectedSession.id,
      inputValue,
      'operator',
      'operator',
      'ORZUTECH Support'
    );

    if (selectedSession.status === 'waiting') {
      await updateSessionInfo(selectedSession.id, { status: 'active' });
    }

    setInputValue('');
    setShowQuickReplies(false);
  };

  const handleQuickReply = async (reply: QuickReply) => {
    if (!selectedSession) return;
    const content = getLocalizedField(reply, 'content');
    await sendMessage(
      selectedSession.id,
      content,
      'operator',
      'operator',
      'ORZUTECH Support',
      'quick_reply'
    );
    setShowQuickReplies(false);
  };

  const handleCloseChat = async () => {
    if (!selectedSession) return;
    await closeSession(selectedSession.id);
    setSelectedSession(null);
    loadSessions();
  };

  const handleSendBuyNow = async () => {
    if (!selectedSession || !selectedSession.product_id) return;
    const productContext = selectedSession.product_context as { name?: string; price?: number };
    await sendMessage(
      selectedSession.id,
      `${language === 'uz' ? 'Mahsulotni sotib olish' : language === 'ru' ? 'Купить товар' : 'Buy this product'}: ${productContext?.name || 'Product'}`,
      'operator',
      'operator',
      'ORZUTECH Support',
      'buy_now',
      { productId: selectedSession.product_id }
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return formatTime(dateString);
    }
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'waiting': return 'bg-orange-100 text-orange-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: { uz: 'Faol', ru: 'Активный', en: 'Active' },
      waiting: { uz: 'Kutilmoqda', ru: 'Ожидание', en: 'Waiting' },
      closed: { uz: 'Yopilgan', ru: 'Закрыт', en: 'Closed' },
    };
    return labels[status as keyof typeof labels]?.[language] || status;
  };

  const filteredSessions = sessions.filter((session) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        session.visitor_name?.toLowerCase().includes(query) ||
        session.visitor_email?.toLowerCase().includes(query) ||
        session.visitor_id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const waitingCount = sessions.filter((s) => s.status === 'waiting').length;

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-orange-500" />
              {language === 'uz' ? 'Chatlar' : language === 'ru' ? 'Чаты' : 'Chats'}
              {waitingCount > 0 && (
                <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                  {waitingCount}
                </span>
              )}
            </h2>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'uz' ? 'Qidirish...' : language === 'ru' ? 'Поиск...' : 'Search...'}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
            />
          </div>

          <div className="flex gap-1">
            {(['all', 'waiting', 'active', 'closed'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterStatus === status
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? (language === 'uz' ? 'Barchasi' : language === 'ru' ? 'Все' : 'All') : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {language === 'uz' ? 'Chatlar topilmadi' : language === 'ru' ? 'Чаты не найдены' : 'No chats found'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSessions.map((session) => (
                <motion.button
                  key={session.id}
                  onClick={() => selectSession(session)}
                  whileHover={{ backgroundColor: 'rgba(249, 115, 22, 0.05)' }}
                  className={`w-full p-3 text-left transition-colors ${
                    selectedSession?.id === session.id ? 'bg-orange-50 border-r-2 border-orange-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {session.visitor_name || session.visitor_id.slice(0, 12) + '...'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(session.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(session.status)}`}>
                          {getStatusLabel(session.status)}
                        </span>
                        {session.unread_count > 0 && (
                          <span className="w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                            {session.unread_count}
                          </span>
                        )}
                      </div>
                      {session.product_context && (session.product_context as { name?: string }).name && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                          <Package className="w-3 h-3" />
                          {(session.product_context as { name: string }).name}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedSession ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedSession.visitor_name || 'Visitor'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {selectedSession.visitor_email && (
                        <span>{selectedSession.visitor_email}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {selectedSession.language.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSession.current_page_url && (
                    <a
                      href={selectedSession.current_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                      title={language === 'uz' ? "Sahifani ko'rish" : language === 'ru' ? 'Просмотреть страницу' : 'View page'}
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                  {selectedSession.status !== 'closed' && (
                    <button
                      onClick={handleCloseChat}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {language === 'uz' ? 'Yopish' : language === 'ru' ? 'Закрыть' : 'Close'}
                    </button>
                  )}
                </div>
              </div>

              {selectedSession.product_id && selectedSession.product_context && (
                <div className="mt-3 p-2 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-600 mb-1">
                    {language === 'uz' ? "Ko'rayotgan mahsulot" : language === 'ru' ? 'Просматриваемый товар' : 'Viewing product'}:
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {(selectedSession.product_context as { name: string }).name}
                    </p>
                    <button
                      onClick={handleSendBuyNow}
                      className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      {language === 'uz' ? "Sotib olish" : language === 'ru' ? 'Купить' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'visitor' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] ${
                          message.sender_type === 'visitor'
                            ? 'bg-white text-gray-900 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
                            : message.sender_type === 'system'
                              ? 'bg-gray-200 text-gray-700 rounded-2xl'
                              : message.sender_type === 'bot'
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md'
                                : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl rounded-br-md'
                        } px-4 py-2.5`}
                      >
                        {message.sender_type === 'bot' && (
                          <p className="text-xs text-blue-200 mb-1 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            AI Assistant
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${
                          message.sender_type === 'visitor' ? 'text-gray-400' : 'text-white/70'
                        }`}>
                          <span className="text-[10px]">{formatTime(message.created_at)}</span>
                          {message.sender_type === 'operator' && (
                            message.is_read ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {selectedSession.status !== 'closed' && (
              <div className="bg-white border-t border-gray-200 p-4">
                <AnimatePresence>
                  {showQuickReplies && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-3 overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2">
                        {quickReplies.map((reply) => (
                          <button
                            key={reply.id}
                            onClick={() => handleQuickReply(reply)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-orange-100 text-sm rounded-full transition-colors"
                          >
                            {getLocalizedField(reply, 'title')}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    className={`p-2.5 rounded-lg transition-colors ${
                      showQuickReplies ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={language === 'uz' ? 'Tez javoblar' : language === 'ru' ? 'Быстрые ответы' : 'Quick replies'}
                  >
                    <Zap className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={language === 'uz' ? 'Xabar yozing...' : language === 'ru' ? 'Напишите сообщение...' : 'Type a message...'}
                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!inputValue.trim()}
                    className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50 shadow-lg shadow-orange-500/30"
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">
                {language === 'uz' ? 'Chatni tanlang' : language === 'ru' ? 'Выберите чат' : 'Select a chat'}
              </p>
              <p className="text-sm mt-1">
                {language === 'uz' ? "Suhbatni boshlash uchun chap paneldan chat tanlang" : language === 'ru' ? 'Выберите чат из левой панели для начала' : 'Select a chat from the left panel to start'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
