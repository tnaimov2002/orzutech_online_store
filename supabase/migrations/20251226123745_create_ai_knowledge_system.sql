/*
  # AI Knowledge System Schema

  1. New Tables
    - `ai_knowledge_base` - Stores vectorized content for RAG
      - `id` (uuid, primary key)
      - `content_type` (enum: product, policy, delivery, store, faq)
      - `source_id` (text, reference to original record)
      - `title` (text)
      - `content` (text, the actual content)
      - `content_uz` (text, Uzbek version)
      - `content_ru` (text, Russian version)
      - `content_en` (text, English version)
      - `metadata` (jsonb, additional data)
      - `embedding` (vector, for similarity search)
      - `updated_at` (timestamp)

    - `ai_faq` - Admin-defined FAQ with exact answers
      - `id` (uuid, primary key)
      - `question_patterns` (text array, matching patterns)
      - `answer_uz` (text)
      - `answer_ru` (text)
      - `answer_en` (text)
      - `category` (text)
      - `priority` (integer)
      - `is_active` (boolean)

    - `ai_answer_history` - Track and approve AI responses
      - `id` (uuid, primary key)
      - `session_id` (uuid, references chat_sessions)
      - `user_message` (text)
      - `ai_response` (text)
      - `language` (text)
      - `script` (text)
      - `knowledge_sources` (jsonb)
      - `is_approved` (boolean)
      - `admin_edited_response` (text)
      - `feedback_rating` (integer)
      - `created_at` (timestamp)

    - `ai_policies` - Store policies content
      - `id` (uuid, primary key)
      - `policy_type` (text: warranty, returns, privacy, terms)
      - `title_uz` (text)
      - `title_ru` (text)
      - `title_en` (text)
      - `content_uz` (text)
      - `content_ru` (text)
      - `content_en` (text)
      - `is_active` (boolean)
      - `updated_at` (timestamp)

    - `ai_analytics` - Track AI performance
      - `id` (uuid, primary key)
      - `date` (date)
      - `total_ai_chats` (integer)
      - `total_handoffs` (integer)
      - `avg_response_time_ms` (integer)
      - `positive_ratings` (integer)
      - `negative_ratings` (integer)

  2. Security
    - Enable RLS on all tables
    - Public can read FAQ and policies
    - Authenticated can manage all AI data
*/

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE ai_content_type AS ENUM ('product', 'policy', 'delivery', 'store', 'faq', 'general');

CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type ai_content_type NOT NULL,
  source_id text,
  title text NOT NULL,
  content text NOT NULL,
  content_uz text,
  content_ru text,
  content_en text,
  metadata jsonb DEFAULT '{}',
  embedding vector(384),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_patterns text[] NOT NULL DEFAULT '{}',
  question_uz text NOT NULL,
  question_ru text NOT NULL,
  question_en text NOT NULL,
  answer_uz text NOT NULL,
  answer_ru text NOT NULL,
  answer_en text NOT NULL,
  category text DEFAULT 'general',
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_answer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE SET NULL,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  language text NOT NULL,
  script text,
  knowledge_sources jsonb DEFAULT '[]',
  is_approved boolean DEFAULT false,
  admin_edited_response text,
  feedback_rating integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type text NOT NULL,
  title_uz text NOT NULL,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  content_uz text NOT NULL,
  content_ru text NOT NULL,
  content_en text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_ai_chats integer DEFAULT 0,
  total_handoffs integer DEFAULT 0,
  avg_response_time_ms integer DEFAULT 0,
  positive_ratings integer DEFAULT 0,
  negative_ratings integer DEFAULT 0,
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_embedding ON ai_knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_type ON ai_knowledge_base(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_faq_active ON ai_faq(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_answer_history_session ON ai_answer_history(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_answer_history_approved ON ai_answer_history(is_approved);

ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_answer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge base"
  ON ai_knowledge_base FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage knowledge"
  ON ai_knowledge_base FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view active FAQ"
  ON ai_faq FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage FAQ"
  ON ai_faq FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can create answer history"
  ON ai_answer_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view answer history"
  ON ai_answer_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage answer history"
  ON ai_answer_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view active policies"
  ON ai_policies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage policies"
  ON ai_policies FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view analytics"
  ON ai_analytics FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage analytics"
  ON ai_analytics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO ai_faq (question_patterns, question_uz, question_ru, question_en, answer_uz, answer_ru, answer_en, category, priority) VALUES
(ARRAY['yetkazib berish', 'доставка', 'delivery', 'yetkazish', 'olib kelish'],
 'Yetkazib berish qancha?',
 'Сколько стоит доставка?',
 'How much is delivery?',
 'Buxoro shahri bo''ylab yetkazib berish BEPUL! Boshqa hududlarga BTS pochta orqali yetkazamiz: 1 kg gacha - 35,000 so''m, har bir qo''shimcha kg uchun +5,000 so''m. Taxminiy muddat: 2-5 kun.',
 'Доставка по городу Бухара БЕСПЛАТНАЯ! В другие регионы доставляем через BTS почту: до 1 кг - 35,000 сум, за каждый дополнительный кг +5,000 сум. Срок: 2-5 дней.',
 'Delivery within Bukhara city is FREE! To other regions via BTS postal: up to 1 kg - 35,000 UZS, +5,000 UZS for each additional kg. Estimated time: 2-5 days.',
 'delivery', 100),

(ARRAY['kafolat', 'гарантия', 'warranty', 'garantiya'],
 'Kafolat qancha?',
 'Какая гарантия?',
 'What is the warranty?',
 'Barcha mahsulotlarimizga rasmiy kafolat beriladi. Kafolat muddati mahsulotga qarab 6 oydan 2 yilgacha. Kafolat davomida bepul ta''mirlash yoki almashtirish xizmati mavjud.',
 'На всю нашу продукцию предоставляется официальная гарантия. Срок гарантии от 6 месяцев до 2 лет в зависимости от товара. В течение гарантийного срока - бесплатный ремонт или замена.',
 'All our products come with official warranty. Warranty period ranges from 6 months to 2 years depending on the product. Free repair or replacement during warranty period.',
 'warranty', 90),

(ARRAY['to''lov', 'оплата', 'payment', 'tolov', 'pul'],
 'Qanday to''lov turlari bor?',
 'Какие способы оплаты?',
 'What payment methods are available?',
 'To''lov usullari: Naqd pul, Plastik karta (Humo, UzCard), Click, Payme. Nasiya ham mavjud - 3, 6, 12 oyga bo''lib to''lash mumkin!',
 'Способы оплаты: Наличные, Пластиковые карты (Humo, UzCard), Click, Payme. Также доступна рассрочка на 3, 6, 12 месяцев!',
 'Payment methods: Cash, Plastic cards (Humo, UzCard), Click, Payme. Installment plans available for 3, 6, 12 months!',
 'payment', 80),

(ARRAY['manzil', 'адрес', 'address', 'qayerda', 'где', 'where', 'magazin', 'магазин', 'store'],
 'Do''kon manzili qayerda?',
 'Где находится магазин?',
 'Where is the store located?',
 'ORZUTECH do''koni Buxoro shahrida joylashgan. Ish vaqti: Dushanba-Shanba 9:00-19:00. Yakshanba - dam olish kuni. Google Maps orqali yo''l topishingiz mumkin.',
 'Магазин ORZUTECH расположен в городе Бухара. Режим работы: Понедельник-Суббота 9:00-19:00. Воскресенье - выходной. Можете найти нас через Google Maps.',
 'ORZUTECH store is located in Bukhara city. Working hours: Monday-Saturday 9:00-19:00. Sunday - closed. You can find us via Google Maps.',
 'store', 70),

(ARRAY['buyurtma', 'заказ', 'order', 'sotib olish', 'купить', 'buy'],
 'Qanday buyurtma beraman?',
 'Как сделать заказ?',
 'How to place an order?',
 'Buyurtma berish juda oson! 1) Mahsulotni tanlang, 2) "Savatga qo''shish" yoki "Hozir sotib olish" tugmasini bosing, 3) Ma''lumotlaringizni kiriting, 4) Yetkazib berish usulini tanlang, 5) Buyurtmani tasdiqlang. Biz siz bilan tez orada bog''lanamiz!',
 'Сделать заказ очень просто! 1) Выберите товар, 2) Нажмите "В корзину" или "Купить сейчас", 3) Введите ваши данные, 4) Выберите способ доставки, 5) Подтвердите заказ. Мы свяжемся с вами в ближайшее время!',
 'Placing an order is very easy! 1) Choose product, 2) Click "Add to Cart" or "Buy Now", 3) Enter your details, 4) Choose delivery method, 5) Confirm order. We will contact you soon!',
 'order', 85),

(ARRAY['qaytarish', 'возврат', 'return', 'almashish', 'обмен', 'exchange'],
 'Mahsulotni qaytarish mumkinmi?',
 'Можно ли вернуть товар?',
 'Can I return a product?',
 'Ha, mahsulotni 14 kun ichida qaytarish mumkin agar: qutisi ochilmagan bo''lsa, ishlatilmagan bo''lsa, hujjatlari saqlanib qolgan bo''lsa. Nuqsonli mahsulotlar kafolat shartlari asosida almashtiriladi.',
 'Да, товар можно вернуть в течение 14 дней при условии: упаковка не вскрыта, товар не использован, документы сохранены. Бракованные товары заменяются по условиям гарантии.',
 'Yes, products can be returned within 14 days if: packaging is unopened, product is unused, documents are preserved. Defective products are replaced under warranty terms.',
 'returns', 75)
ON CONFLICT DO NOTHING;

INSERT INTO ai_policies (policy_type, title_uz, title_ru, title_en, content_uz, content_ru, content_en) VALUES
('warranty', 'Kafolat shartlari', 'Условия гарантии', 'Warranty Terms',
 'ORZUTECH barcha mahsulotlariga rasmiy kafolat beradi. Kafolat muddati: Kompyuterlar - 1 yil, Telefonlar - 1 yil, Aksessuarlar - 6 oy. Kafolat quyidagi hollarda amal qilmaydi: suv tushgan, mexanik shikastlangan, norasmiy ta''mirlangan mahsulotlar.',
 'ORZUTECH предоставляет официальную гарантию на всю продукцию. Сроки гарантии: Компьютеры - 1 год, Телефоны - 1 год, Аксессуары - 6 месяцев. Гарантия не распространяется на: товары с попаданием влаги, механическими повреждениями, неофициальным ремонтом.',
 'ORZUTECH provides official warranty on all products. Warranty periods: Computers - 1 year, Phones - 1 year, Accessories - 6 months. Warranty does not cover: water damage, mechanical damage, unofficial repairs.'),

('returns', 'Qaytarish shartlari', 'Условия возврата', 'Return Policy',
 'Mahsulotni sotib olingan kundan 14 kun ichida qaytarish mumkin. Shartlar: original qadoqlash, ishlatilmagan holat, chek va hujjatlar. Qaytarish jarayoni 3-5 ish kunini oladi. Pul qaytarish usuli xarid usuliga bog''liq.',
 'Товар можно вернуть в течение 14 дней с момента покупки. Условия: оригинальная упаковка, неиспользованное состояние, чек и документы. Процесс возврата занимает 3-5 рабочих дней. Способ возврата денег зависит от способа покупки.',
 'Products can be returned within 14 days of purchase. Conditions: original packaging, unused condition, receipt and documents. Return process takes 3-5 business days. Refund method depends on purchase method.'),

('privacy', 'Maxfiylik siyosati', 'Политика конфиденциальности', 'Privacy Policy',
 'ORZUTECH mijozlar ma''lumotlarini himoya qiladi. Shaxsiy ma''lumotlar faqat buyurtmalarni bajarish uchun ishlatiladi. Uchinchi tomonlarga ma''lumot berilmaydi. Ma''lumotlar xavfsiz serverda saqlanadi.',
 'ORZUTECH защищает данные клиентов. Личные данные используются только для выполнения заказов. Данные не передаются третьим лицам. Информация хранится на защищенных серверах.',
 'ORZUTECH protects customer data. Personal information is used only for order fulfillment. Data is not shared with third parties. Information is stored on secure servers.')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content_type ai_content_type,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content_type,
    kb.title,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM ai_knowledge_base kb
  WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;