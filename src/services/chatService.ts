import { supabase } from '../lib/supabase';

export interface ChatSession {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  assigned_operator_id: string | null;
  status: 'active' | 'waiting' | 'closed';
  current_page_url: string | null;
  product_id: string | null;
  product_context: Record<string, unknown>;
  language: string;
  is_offline_message: boolean;
  unread_count: number;
  last_message_at: string;
  created_at: string;
  closed_at: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: 'visitor' | 'operator' | 'system' | 'bot';
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  message_type: 'text' | 'product_link' | 'buy_now' | 'quick_reply' | 'image';
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface ChatOperator {
  id: string;
  display_name: string;
  avatar_url: string | null;
  status: 'online' | 'busy' | 'offline';
  is_active: boolean;
  last_seen_at: string;
}

export interface QuickReply {
  id: string;
  category: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  content_uz: string;
  content_ru: string;
  content_en: string;
  sort_order: number;
}

const VISITOR_ID_KEY = 'orzutech_chat_visitor_id';

function generateVisitorId(): string {
  return `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export function getOrCreateVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export async function getOnlineOperators(): Promise<ChatOperator[]> {
  const { data, error } = await supabase
    .from('chat_operators')
    .select('*')
    .eq('status', 'online')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching online operators:', error);
    return [];
  }
  return data || [];
}

export async function hasOnlineOperators(): Promise<boolean> {
  const operators = await getOnlineOperators();
  return operators.length > 0;
}

export async function getOrCreateSession(
  visitorId: string,
  language: string,
  pageUrl?: string,
  productContext?: { id: string; name: string; model?: string; category?: string }
): Promise<ChatSession | null> {
  const { data: existingSession } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('visitor_id', visitorId)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSession) {
    if (pageUrl || productContext) {
      await supabase
        .from('chat_sessions')
        .update({
          current_page_url: pageUrl || existingSession.current_page_url,
          product_id: productContext?.id || existingSession.product_id,
          product_context: productContext || existingSession.product_context,
        })
        .eq('id', existingSession.id);
    }
    return existingSession;
  }

  const isOffline = !(await hasOnlineOperators());

  const { data: newSession, error } = await supabase
    .from('chat_sessions')
    .insert({
      visitor_id: visitorId,
      language,
      current_page_url: pageUrl,
      product_id: productContext?.id,
      product_context: productContext || {},
      is_offline_message: isOffline,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }

  return newSession;
}

export async function sendMessage(
  sessionId: string,
  content: string,
  senderType: 'visitor' | 'operator' | 'system' | 'bot',
  senderId?: string,
  senderName?: string,
  messageType: 'text' | 'product_link' | 'buy_now' | 'quick_reply' | 'image' = 'text',
  metadata?: Record<string, unknown>
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      content,
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName,
      message_type: messageType,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data;
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data || [];
}

export async function markMessagesAsRead(sessionId: string, senderType: 'visitor' | 'operator'): Promise<void> {
  const readBy = senderType === 'visitor' ? 'operator' : 'visitor';

  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('session_id', sessionId)
    .eq('sender_type', readBy)
    .eq('is_read', false);

  if (senderType === 'operator') {
    await supabase
      .from('chat_sessions')
      .update({ unread_count: 0 })
      .eq('id', sessionId);
  }
}

export async function updateSessionInfo(
  sessionId: string,
  updates: Partial<{
    visitor_name: string;
    visitor_email: string;
    visitor_phone: string;
    status: 'active' | 'waiting' | 'closed';
    assigned_operator_id: string;
  }>
): Promise<void> {
  await supabase
    .from('chat_sessions')
    .update(updates)
    .eq('id', sessionId);
}

export async function closeSession(sessionId: string): Promise<void> {
  await supabase
    .from('chat_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
}

export async function getQuickReplies(): Promise<QuickReply[]> {
  const { data, error } = await supabase
    .from('chat_quick_replies')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching quick replies:', error);
    return [];
  }

  return data || [];
}

export async function getAllSessions(
  status?: 'active' | 'waiting' | 'closed',
  limit = 50
): Promise<ChatSession[]> {
  let query = supabase
    .from('chat_sessions')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  return data || [];
}

export async function getWaitingSessionsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('chat_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waiting');

  if (error) {
    console.error('Error counting waiting sessions:', error);
    return 0;
  }

  return count || 0;
}

export async function updateOperatorStatus(
  operatorId: string,
  status: 'online' | 'busy' | 'offline'
): Promise<void> {
  await supabase
    .from('chat_operators')
    .update({
      status,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', operatorId);
}

export async function assignOperatorToSession(
  sessionId: string,
  operatorId: string
): Promise<void> {
  await supabase
    .from('chat_sessions')
    .update({
      assigned_operator_id: operatorId,
      status: 'active',
    })
    .eq('id', sessionId);
}

export function subscribeToMessages(
  sessionId: string,
  callback: (message: ChatMessage) => void
) {
  const channel = supabase
    .channel(`messages:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        callback(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToSessions(
  callback: (session: ChatSession) => void
) {
  const channel = supabase
    .channel('all_sessions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_sessions',
      },
      (payload) => {
        callback(payload.new as ChatSession);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function sendOfflineNotification(
  sessionId: string,
  visitorEmail: string,
  visitorName: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-offline-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          visitorEmail,
          visitorName,
          message,
        }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Error sending offline notification:', error);
    return false;
  }
}
