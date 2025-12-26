import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import {
  ChatSession,
  ChatMessage,
  getOrCreateVisitorId,
  getOrCreateSession,
  sendMessage,
  getSessionMessages,
  hasOnlineOperators,
  subscribeToMessages,
  markMessagesAsRead,
  updateSessionInfo,
  sendOfflineNotification,
} from '../services/chatService';

interface ProductContext {
  id: string;
  name: string;
  model?: string;
  category?: string;
  image?: string;
  price?: number;
}

interface ChatContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
  session: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isOnline: boolean;
  unreadCount: number;
  productContext: ProductContext | null;
  setProductContext: (context: ProductContext | null) => void;
  sendUserMessage: (content: string) => Promise<void>;
  submitOfflineForm: (name: string, email: string, message: string) => Promise<boolean>;
  initializeChat: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { language } = useLanguage();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [productContext, setProductContext] = useState<ProductContext | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);

  useEffect(() => {
    const checkOperators = async () => {
      const online = await hasOnlineOperators();
      setIsOnline(online);
    };
    checkOperators();
    const interval = setInterval(checkOperators, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeChat = useCallback(async () => {
    if (session) return;

    setIsLoading(true);
    const visitorId = getOrCreateVisitorId();
    const newSession = await getOrCreateSession(
      visitorId,
      language,
      window.location.href,
      productContext ? {
        id: productContext.id,
        name: productContext.name,
        model: productContext.model,
        category: productContext.category,
      } : undefined
    );

    if (newSession) {
      setSession(newSession);
      const existingMessages = await getSessionMessages(newSession.id);
      setMessages(existingMessages);

      if (existingMessages.length === 0 && !hasGreeted) {
        const greetings = {
          uz: "Salom! ORZUTECH qo'llab-quvvatlash xizmati. Sizga qanday yordam bera olamiz?",
          ru: 'Здравствуйте! Служба поддержки ORZUTECH. Чем можем помочь?',
          en: 'Hello! ORZUTECH support service. How can we help you?',
        };
        await sendMessage(
          newSession.id,
          greetings[language as keyof typeof greetings] || greetings.uz,
          'system',
          'system',
          'ORZUTECH'
        );
        setHasGreeted(true);
      }
    }
    setIsLoading(false);
  }, [session, language, productContext, hasGreeted]);

  useEffect(() => {
    if (!session) return;

    const unsubscribe = subscribeToMessages(session.id, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      if (newMessage.sender_type === 'operator' && !isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [session, isOpen]);

  useEffect(() => {
    if (isOpen && session && unreadCount > 0) {
      markMessagesAsRead(session.id, 'visitor');
      setUnreadCount(0);
    }
  }, [isOpen, session, unreadCount]);

  useEffect(() => {
    if (session) {
      updateSessionInfo(session.id, {});
    }
  }, [location.pathname, session]);

  const sendUserMessage = useCallback(async (content: string) => {
    if (!session || !content.trim()) return;

    const visitorId = getOrCreateVisitorId();
    await sendMessage(
      session.id,
      content,
      'visitor',
      visitorId,
      session.visitor_name || undefined
    );
  }, [session]);

  const submitOfflineForm = useCallback(async (
    name: string,
    email: string,
    message: string
  ): Promise<boolean> => {
    if (!session) return false;

    await updateSessionInfo(session.id, {
      visitor_name: name,
      visitor_email: email,
    });

    setSession((prev) => prev ? { ...prev, visitor_name: name, visitor_email: email } : null);

    await sendMessage(session.id, message, 'visitor', getOrCreateVisitorId(), name);

    const success = await sendOfflineNotification(session.id, email, name, message);
    return success;
  }, [session]);

  const value: ChatContextValue = {
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    session,
    messages,
    isLoading,
    isOnline,
    unreadCount,
    productContext,
    setProductContext,
    sendUserMessage,
    submitOfflineForm,
    initializeChat,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
