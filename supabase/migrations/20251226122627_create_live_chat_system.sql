/*
  # Live Chat System Schema

  1. New Tables
    - `chat_operators` - Store chat operators/support staff
      - `id` (uuid, primary key)
      - `user_id` (uuid, references admin users)
      - `display_name` (text)
      - `avatar_url` (text)
      - `status` (enum: online, busy, offline)
      - `is_active` (boolean)
      - `last_seen_at` (timestamp)
      - `created_at` (timestamp)

    - `chat_sessions` - Store chat conversations
      - `id` (uuid, primary key)
      - `visitor_id` (text, unique identifier for visitor)
      - `visitor_name` (text)
      - `visitor_email` (text)
      - `visitor_phone` (text)
      - `assigned_operator_id` (uuid, references chat_operators)
      - `status` (enum: active, waiting, closed)
      - `current_page_url` (text)
      - `product_id` (uuid, references products)
      - `product_context` (jsonb)
      - `language` (text)
      - `is_offline_message` (boolean)
      - `unread_count` (integer)
      - `last_message_at` (timestamp)
      - `created_at` (timestamp)
      - `closed_at` (timestamp)

    - `chat_messages` - Store individual messages
      - `id` (uuid, primary key)
      - `session_id` (uuid, references chat_sessions)
      - `sender_type` (enum: visitor, operator, system, bot)
      - `sender_id` (text)
      - `sender_name` (text)
      - `content` (text)
      - `message_type` (enum: text, product_link, buy_now, quick_reply, image)
      - `metadata` (jsonb)
      - `is_read` (boolean)
      - `created_at` (timestamp)

    - `chat_quick_replies` - Predefined quick responses
      - `id` (uuid, primary key)
      - `category` (text)
      - `title_uz` (text)
      - `title_ru` (text)
      - `title_en` (text)
      - `content_uz` (text)
      - `content_ru` (text)
      - `content_en` (text)
      - `sort_order` (integer)
      - `is_active` (boolean)

    - `chat_settings` - System settings
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (jsonb)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Public can create sessions and messages (for visitors)
    - Authenticated users can manage all chat data
*/

CREATE TYPE chat_operator_status AS ENUM ('online', 'busy', 'offline');
CREATE TYPE chat_session_status AS ENUM ('active', 'waiting', 'closed');
CREATE TYPE chat_sender_type AS ENUM ('visitor', 'operator', 'system', 'bot');
CREATE TYPE chat_message_type AS ENUM ('text', 'product_link', 'buy_now', 'quick_reply', 'image');

CREATE TABLE IF NOT EXISTS chat_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  avatar_url text,
  status chat_operator_status DEFAULT 'offline',
  is_active boolean DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  visitor_name text,
  visitor_email text,
  visitor_phone text,
  assigned_operator_id uuid REFERENCES chat_operators(id) ON DELETE SET NULL,
  status chat_session_status DEFAULT 'waiting',
  current_page_url text,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_context jsonb DEFAULT '{}',
  language text DEFAULT 'uz',
  is_offline_message boolean DEFAULT false,
  unread_count integer DEFAULT 0,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_type chat_sender_type NOT NULL,
  sender_id text,
  sender_name text,
  content text NOT NULL,
  message_type chat_message_type DEFAULT 'text',
  metadata jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general',
  title_uz text NOT NULL,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  content_uz text NOT NULL,
  content_ru text NOT NULL,
  content_en text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_visitor_id ON chat_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_assigned_operator ON chat_sessions(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_operators_status ON chat_operators(status);

ALTER TABLE chat_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view online operators"
  ON chat_operators FOR SELECT
  USING (status = 'online' AND is_active = true);

CREATE POLICY "Authenticated users can manage operators"
  ON chat_operators FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can create chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view their own sessions"
  ON chat_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update their own sessions"
  ON chat_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can create messages"
  ON chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view messages in their sessions"
  ON chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update messages"
  ON chat_messages FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view active quick replies"
  ON chat_quick_replies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage quick replies"
  ON chat_quick_replies FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view chat settings"
  ON chat_settings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage settings"
  ON chat_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO chat_settings (key, value) VALUES 
  ('auto_greeting', '{"enabled": true, "delay_seconds": 2}'),
  ('offline_email', '{"enabled": true, "admin_email": "support@orzutech.uz"}'),
  ('telegram_webhook', '{"enabled": false, "bot_token": "", "chat_id": ""}'),
  ('auto_triggers', '{"idle_seconds": 20, "cart_exit_intent": true}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO chat_quick_replies (category, title_uz, title_ru, title_en, content_uz, content_ru, content_en, sort_order) VALUES
  ('greeting', 'Salomlashish', 'Приветствие', 'Greeting', 
   'Salom! ORZUTECH qo''llab-quvvatlash xizmati. Sizga qanday yordam bera olamiz?', 
   'Здравствуйте! Служба поддержки ORZUTECH. Чем можем помочь?', 
   'Hello! ORZUTECH support service. How can we help you?', 1),
  ('delivery', 'Yetkazib berish', 'Доставка', 'Delivery',
   'Yetkazib berish Buxoro shahri bo''ylab bepul. Boshqa hududlarga BTS pochta orqali 35,000 so''mdan.',
   'Доставка по городу Бухара бесплатная. В другие регионы через BTS почту от 35,000 сум.',
   'Delivery is free within Bukhara city. To other regions via BTS postal from 35,000 UZS.', 2),
  ('warranty', 'Kafolat', 'Гарантия', 'Warranty',
   'Barcha mahsulotlarimizga rasmiy kafolat beriladi. Kafolat muddati mahsulotga qarab 6 oydan 2 yilgacha.',
   'На всю нашу продукцию предоставляется официальная гарантия. Срок гарантии от 6 месяцев до 2 лет.',
   'All our products come with official warranty. Warranty period ranges from 6 months to 2 years.', 3),
  ('payment', 'To''lov', 'Оплата', 'Payment',
   'Naqd pul, plastik karta, Click va Payme orqali to''lash mumkin. Nasiya ham mavjud!',
   'Оплата наличными, картой, через Click и Payme. Также доступна рассрочка!',
   'Payment by cash, card, Click and Payme accepted. Installment plans available!', 4),
  ('closing', 'Xayr', 'Прощание', 'Goodbye',
   'Murojaat uchun rahmat! Yana savollaringiz bo''lsa, bemalol yozing.',
   'Спасибо за обращение! Если будут еще вопросы, пишите.',
   'Thank you for reaching out! Feel free to write if you have more questions.', 5)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET 
    last_message_at = NEW.created_at,
    unread_count = CASE 
      WHEN NEW.sender_type = 'visitor' THEN unread_count + 1 
      ELSE unread_count 
    END
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_session_last_message ON chat_messages;
CREATE TRIGGER trigger_update_session_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_message();