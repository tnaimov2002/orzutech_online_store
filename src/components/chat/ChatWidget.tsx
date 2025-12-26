import { useState, useEffect, useRef, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Minus,
  User,
  Bot,
  Loader2,
  Mail,
  Phone,
  ChevronRight,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useChatContext } from '../../context/ChatContext';
import { formatPrice } from '../../utils/format';

export default function ChatWidget() {
  const { language } = useLanguage();
  const {
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    messages,
    isLoading,
    isOnline,
    unreadCount,
    productContext,
    sendUserMessage,
    submitOfflineForm,
    initializeChat,
    session,
  } = useChatContext();

  const [inputValue, setInputValue] = useState('');
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineFormData, setOfflineFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);
  const [offlineSubmitted, setOfflineSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const labels = {
    title: language === 'uz' ? 'ORZUTECH Yordam' : language === 'ru' ? 'ORZUTECH Поддержка' : 'ORZUTECH Support',
    online: language === 'uz' ? 'Onlayn' : language === 'ru' ? 'Онлайн' : 'Online',
    offline: language === 'uz' ? 'Oflayn' : language === 'ru' ? 'Офлайн' : 'Offline',
    placeholder: language === 'uz' ? 'Xabar yozing...' : language === 'ru' ? 'Напишите сообщение...' : 'Type a message...',
    send: language === 'uz' ? 'Yuborish' : language === 'ru' ? 'Отправить' : 'Send',
    offlineTitle: language === 'uz' ? 'Hozir operatorlar band' : language === 'ru' ? 'Операторы сейчас заняты' : 'Operators are currently busy',
    offlineDesc: language === 'uz' ? "Xabaringizni qoldiring, biz siz bilan bog'lanamiz" : language === 'ru' ? 'Оставьте сообщение, мы свяжемся с вами' : 'Leave a message, we will contact you',
    name: language === 'uz' ? 'Ismingiz' : language === 'ru' ? 'Ваше имя' : 'Your name',
    email: language === 'uz' ? 'Email' : language === 'ru' ? 'Email' : 'Email',
    message: language === 'uz' ? 'Xabar' : language === 'ru' ? 'Сообщение' : 'Message',
    submit: language === 'uz' ? 'Yuborish' : language === 'ru' ? 'Отправить' : 'Submit',
    thankYou: language === 'uz' ? 'Rahmat!' : language === 'ru' ? 'Спасибо!' : 'Thank you!',
    willContact: language === 'uz' ? "Tez orada siz bilan bog'lanamiz" : language === 'ru' ? 'Мы скоро свяжемся с вами' : 'We will contact you soon',
    viewingProduct: language === 'uz' ? "Ko'rayotgan mahsulot" : language === 'ru' ? 'Просматриваемый товар' : 'Viewing product',
    buyNow: language === 'uz' ? 'Sotib olish' : language === 'ru' ? 'Купить' : 'Buy Now',
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleOpen = async () => {
    setIsOpen(true);
    setIsMinimized(false);
    await initializeChat();
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (!isOnline && !session?.visitor_email) {
      setShowOfflineForm(true);
      setOfflineFormData((prev) => ({ ...prev, message: inputValue }));
      setInputValue('');
      return;
    }

    await sendUserMessage(inputValue);
    setInputValue('');
  };

  const handleOfflineSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!offlineFormData.name || !offlineFormData.email || !offlineFormData.message) return;

    setOfflineSubmitting(true);
    const success = await submitOfflineForm(
      offlineFormData.name,
      offlineFormData.email,
      offlineFormData.message
    );
    setOfflineSubmitting(false);

    if (success) {
      setOfflineSubmitted(true);
      setShowOfflineForm(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const widgetContent = (
    <div className="fixed bottom-4 right-4 z-[9997]">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="chat-button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleOpen}
            className="relative w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full shadow-lg shadow-orange-500/40 flex items-center justify-center text-white hover:shadow-xl hover:shadow-orange-500/50 transition-shadow"
          >
            <MessageCircle className="w-7 h-7" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
            <span className="absolute -top-1 -right-1 w-3 h-3">
              <span className={`absolute inset-0 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-400'} animate-ping`} />
              <span className={`absolute inset-0 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
            </span>
          </motion.button>
        ) : isMinimized ? (
          <motion.button
            key="chat-minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsMinimized(false)}
            className="w-64 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-3 text-white cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold">{labels.title}</span>
              </div>
              {unreadCount > 0 && (
                <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-[380px] h-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">{labels.title}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-white/90">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`} />
                      {isOnline ? labels.online : labels.offline}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleMinimize}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {productContext && (
              <div className="px-4 py-2 bg-orange-50 border-b border-orange-100">
                <p className="text-xs text-orange-600 mb-1">{labels.viewingProduct}:</p>
                <div className="flex items-center gap-2">
                  {productContext.image && (
                    <img
                      src={productContext.image}
                      alt={productContext.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{productContext.name}</p>
                    {productContext.price && (
                      <p className="text-xs text-orange-600 font-semibold">
                        {formatPrice(productContext.price)} UZS
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex ${message.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          message.sender_type === 'visitor'
                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl rounded-br-md'
                            : message.sender_type === 'system'
                              ? 'bg-gray-200 text-gray-700 rounded-2xl rounded-bl-md'
                              : 'bg-white text-gray-900 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
                        } px-4 py-2.5`}
                      >
                        {message.sender_type !== 'visitor' && message.sender_name && (
                          <p className="text-xs font-semibold mb-1 opacity-70">
                            {message.sender_name}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                        {message.message_type === 'buy_now' && message.metadata?.productId && (
                          <a
                            href={`/product/${message.metadata.productId}`}
                            className="mt-2 flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            {labels.buyNow}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <p className={`text-[10px] mt-1 ${
                          message.sender_type === 'visitor' ? 'text-white/70' : 'text-gray-400'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {offlineSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-6"
                    >
                      <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-green-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">{labels.thankYou}</h4>
                      <p className="text-sm text-gray-600">{labels.willContact}</p>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <AnimatePresence>
              {showOfflineForm && !offlineSubmitted && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 bg-white overflow-hidden"
                >
                  <form onSubmit={handleOfflineSubmit} className="p-4 space-y-3">
                    <div className="text-center mb-3">
                      <p className="font-semibold text-gray-900">{labels.offlineTitle}</p>
                      <p className="text-xs text-gray-500">{labels.offlineDesc}</p>
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={offlineFormData.name}
                        onChange={(e) => setOfflineFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder={labels.name}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={offlineFormData.email}
                        onChange={(e) => setOfflineFormData((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder={labels.email}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                        required
                      />
                    </div>
                    <textarea
                      value={offlineFormData.message}
                      onChange={(e) => setOfflineFormData((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder={labels.message}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm resize-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={offlineSubmitting}
                      className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-shadow disabled:opacity-50"
                    >
                      {offlineSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {labels.submit}
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {!showOfflineForm && !offlineSubmitted && (
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={labels.placeholder}
                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-sm"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!inputValue.trim()}
                    className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(widgetContent, document.body);
  }

  return null;
}
