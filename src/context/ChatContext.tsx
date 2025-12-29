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
  subscribeToSession,
  markMessagesAsRead,
  updateSessionInfo,
  sendOfflineNotification,
  getAIResponse,
  requestOperatorHandoff,
  resumeAIMode,
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
  isAIMode: boolean;
  isAITyping: boolean;
  isHandoffPending: boolean;
  isConnectedToOperator: boolean;
  unreadCount: number;
  productContext: ProductContext | null;
  setProductContext: (context: ProductContext | null) => void;
  sendUserMessage: (content: string) => Promise<void>;
  submitOfflineForm: (name: string, email: string, message: string) => Promise<boolean>;
  initializeChat: () => Promise<void>;
  requestOperator: () => Promise<{ success: boolean; operatorAvailable: boolean }>;
  resumeAI: () => Promise<void>;
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
  const [isAIMode, setIsAIMode] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [isHandoffPending, setIsHandoffPending] = useState(false);
  const [isConnectedToOperator, setIsConnectedToOperator] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [productContext, setProductContext] = useState<ProductContext | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);

  useEffect(() => {
    const checkOperators = async () => {
      const online = await hasOnlineOperators();
      setIsOnline(online);
      setIsAIMode(!online);
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
        const operatorsOnline = await hasOnlineOperators();

        const greetings = {
          uz: operatorsOnline
            ? "Salom! ORZUTECH qo'llab-quvvatlash xizmati. Sizga qanday yordam bera olamiz?"
            : "Salom! Men ORZUTECH sun'iy intellekt yordamchisiman. Hozir operatorlar band. Sizga qanday yordam bera olaman?",
          ru: operatorsOnline
            ? 'Здравствуйте! Служба поддержки ORZUTECH. Чем можем помочь?'
            : 'Здравствуйте! Я AI-помощник ORZUTECH. Сейчас операторы заняты. Чем могу помочь?',
          en: operatorsOnline
            ? 'Hello! ORZUTECH support service. How can we help you?'
            : 'Hello! I am ORZUTECH AI assistant. Operators are currently busy. How can I help you?',
        };

        await sendMessage(
          newSession.id,
          greetings[language as keyof typeof greetings] || greetings.uz,
          operatorsOnline ? 'system' : 'bot',
          operatorsOnline ? 'system' : 'ai',
          operatorsOnline ? 'ORZUTECH' : 'ORZUTECH AI'
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

      if ((newMessage.sender_type === 'operator' || newMessage.sender_type === 'bot') && !isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [session, isOpen]);

  useEffect(() => {
    if (!session) return;

    const unsubscribe = subscribeToSession(session.id, (updatedSession) => {
      setSession(updatedSession);
      if (updatedSession.assigned_operator_id && updatedSession.ai_disabled) {
        setIsConnectedToOperator(true);
        setIsHandoffPending(false);
        setIsAIMode(false);
      } else if (!updatedSession.ai_disabled) {
        setIsConnectedToOperator(false);
      }
    });

    return unsubscribe;
  }, [session?.id]);

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
    const userMsg = await sendMessage(
      session.id,
      content,
      'visitor',
      visitorId,
      session.visitor_name || undefined
    );

    if (!userMsg) {
      console.error('Failed to send user message');
      return;
    }

    if (session.ai_disabled || isConnectedToOperator) {
      return;
    }

    const operatorsOnline = await hasOnlineOperators();

    if (!operatorsOnline) {
      setIsAITyping(true);

      try {
        const aiResponse = await getAIResponse(
          session.id,
          content,
          productContext ? {
            id: productContext.id,
            name: productContext.name,
            price: productContext.price,
            category: productContext.category,
          } : undefined
        );

        setIsAITyping(false);

        if (aiResponse?.success && aiResponse.response) {
          const botMsg = await sendMessage(
            session.id,
            aiResponse.response,
            'bot',
            'ai',
            'ORZUTECH AI'
          );

          if (!botMsg) {
            console.error('Failed to save AI response to chat');
          }
        } else if (aiResponse?.response) {
          await sendMessage(
            session.id,
            aiResponse.response,
            'bot',
            'ai',
            'ORZUTECH AI'
          );
        } else {
          const fallbackMessages = {
            uz: "Kechirasiz, hozir javob berishda muammo bor. Iltimos, biroz kutib qayta urinib ko'ring.",
            ru: "Извините, возникла проблема. Пожалуйста, попробуйте позже.",
            en: "Sorry, there was an issue. Please try again later."
          };
          await sendMessage(
            session.id,
            fallbackMessages[language as keyof typeof fallbackMessages] || fallbackMessages.uz,
            'bot',
            'ai',
            'ORZUTECH AI'
          );
        }
      } catch (error) {
        console.error('AI response error:', error);
        setIsAITyping(false);

        const errorMessages = {
          uz: "Texnik xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
          ru: "Произошла техническая ошибка. Попробуйте еще раз.",
          en: "A technical error occurred. Please try again."
        };
        await sendMessage(
          session.id,
          errorMessages[language as keyof typeof errorMessages] || errorMessages.uz,
          'bot',
          'ai',
          'ORZUTECH AI'
        );
      }
    }
  }, [session, productContext, language, isConnectedToOperator]);

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

  const requestOperator = useCallback(async (): Promise<{ success: boolean; operatorAvailable: boolean }> => {
    if (!session) return { success: false, operatorAvailable: false };

    setIsHandoffPending(true);

    const handoffMessages = {
      uz: "Operator bilan bog'lanish so'rovi yuborildi. Iltimos, kuting...",
      ru: "Запрос на связь с оператором отправлен. Пожалуйста, подождите...",
      en: "Request to connect with operator sent. Please wait..."
    };

    await sendMessage(
      session.id,
      handoffMessages[language as keyof typeof handoffMessages] || handoffMessages.uz,
      'system',
      'system',
      'System'
    );

    const result = await requestOperatorHandoff(session.id);

    if (result.success) {
      if (result.operatorAvailable) {
        const connectedMessages = {
          uz: `Operator ${result.operatorName || ''} ulanmoqda. Tez orada javob olasiz.`,
          ru: `Оператор ${result.operatorName || ''} подключается. Скоро получите ответ.`,
          en: `Operator ${result.operatorName || ''} is connecting. You will receive a response soon.`
        };
        await sendMessage(
          session.id,
          connectedMessages[language as keyof typeof connectedMessages] || connectedMessages.uz,
          'system',
          'system',
          'System'
        );
        setIsConnectedToOperator(true);
        setIsAIMode(false);
      } else {
        const noOperatorMessages = {
          uz: "Hozir operatorlar band. Xabaringizni qoldiring, tez orada bog'lanamiz.",
          ru: "Сейчас операторы заняты. Оставьте сообщение, мы скоро свяжемся с вами.",
          en: "Operators are currently busy. Leave a message and we will contact you soon."
        };
        await sendMessage(
          session.id,
          noOperatorMessages[language as keyof typeof noOperatorMessages] || noOperatorMessages.uz,
          'system',
          'system',
          'System'
        );
      }
      setIsHandoffPending(false);
    } else {
      setIsHandoffPending(false);
    }

    return { success: result.success, operatorAvailable: result.operatorAvailable };
  }, [session, language]);

  const resumeAI = useCallback(async (): Promise<void> => {
    if (!session) return;

    await resumeAIMode(session.id);
    setIsConnectedToOperator(false);
    setIsAIMode(true);

    const resumeMessages = {
      uz: "AI yordamchi qayta faollashtirildi. Sizga qanday yordam bera olaman?",
      ru: "AI-помощник снова активен. Чем могу помочь?",
      en: "AI assistant is active again. How can I help you?"
    };
    await sendMessage(
      session.id,
      resumeMessages[language as keyof typeof resumeMessages] || resumeMessages.uz,
      'bot',
      'ai',
      'ORZUTECH AI'
    );
  }, [session, language]);

  const value: ChatContextValue = {
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    session,
    messages,
    isLoading,
    isOnline,
    isAIMode,
    isAITyping,
    isHandoffPending,
    isConnectedToOperator,
    unreadCount,
    productContext,
    setProductContext,
    sendUserMessage,
    submitOfflineForm,
    initializeChat,
    requestOperator,
    resumeAI,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
