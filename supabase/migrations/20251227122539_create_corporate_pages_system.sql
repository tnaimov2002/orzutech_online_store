/*
  # Corporate Pages Content Management System

  1. New Tables
    - `corporate_page_sections`
      - Stores all editable sections for About, Services, Contact pages
      - Supports multilingual content (uz/ru/en)
      - Supports image URL and file upload
    - `company_timeline`
      - History timeline entries with year, title, description, image
    - `company_team`
      - Team information including image and stats
    - `company_achievements`
      - Achievement cards with icons
    - `company_services`
      - Service blocks with image alternating layout
    - `partner_brands`
      - Partner/brand logos
    - `contact_messages`
      - Messages from contact form
    - `why_choose_us`
      - Why choose us cards

  2. Security
    - Enable RLS on all tables
    - Public read access for content tables
    - Admin-only write access
*/

-- Corporate page sections (hero, CTA, etc.)
CREATE TABLE IF NOT EXISTS corporate_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text NOT NULL CHECK (page_type IN ('about', 'services', 'contact')),
  section_key text NOT NULL,
  title_uz text DEFAULT '',
  title_ru text DEFAULT '',
  title_en text DEFAULT '',
  subtitle_uz text DEFAULT '',
  subtitle_ru text DEFAULT '',
  subtitle_en text DEFAULT '',
  content_uz text DEFAULT '',
  content_ru text DEFAULT '',
  content_en text DEFAULT '',
  image_url text,
  video_url text,
  extra_data jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page_type, section_key)
);

ALTER TABLE corporate_page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read corporate sections"
  ON corporate_page_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage corporate sections"
  ON corporate_page_sections FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Company timeline (history)
CREATE TABLE IF NOT EXISTS company_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  title_uz text NOT NULL,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  description_uz text DEFAULT '',
  description_ru text DEFAULT '',
  description_en text DEFAULT '',
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read timeline"
  ON company_timeline FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage timeline"
  ON company_timeline FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Company services
CREATE TABLE IF NOT EXISTS company_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_uz text NOT NULL,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  description_uz text DEFAULT '',
  description_ru text DEFAULT '',
  description_en text DEFAULT '',
  bullet_points_uz text[] DEFAULT '{}',
  bullet_points_ru text[] DEFAULT '{}',
  bullet_points_en text[] DEFAULT '{}',
  image_url text,
  icon text DEFAULT 'CheckCircle',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read services"
  ON company_services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage services"
  ON company_services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Company achievements
CREATE TABLE IF NOT EXISTS company_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_uz text NOT NULL,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  description_uz text DEFAULT '',
  description_ru text DEFAULT '',
  description_en text DEFAULT '',
  icon text DEFAULT 'Award',
  value text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE company_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read achievements"
  ON company_achievements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage achievements"
  ON company_achievements FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Why choose us cards
CREATE TABLE IF NOT EXISTS why_choose_us (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_uz text NOT NULL,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  description_uz text DEFAULT '',
  description_ru text DEFAULT '',
  description_en text DEFAULT '',
  icon text DEFAULT 'Star',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE why_choose_us ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read why choose us"
  ON why_choose_us FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage why choose us"
  ON why_choose_us FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Partner brands
CREATE TABLE IF NOT EXISTS partner_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read partner brands"
  ON partner_brands FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage partner brands"
  ON partner_brands FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can read contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can update contact messages"
  ON contact_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Company team info
CREATE TABLE IF NOT EXISTS company_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_uz text NOT NULL,
  title_ru text NOT NULL,
  title_en text NOT NULL,
  description_uz text DEFAULT '',
  description_ru text DEFAULT '',
  description_en text DEFAULT '',
  image_url text,
  stats jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read team info"
  ON company_team FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage team info"
  ON company_team FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default timeline data
INSERT INTO company_timeline (year, title_uz, title_ru, title_en, description_uz, description_ru, description_en, sort_order) VALUES
(2007, 'Kompaniya tashkil etilishi', 'Основание компании', 'Company Founded', 
 'ORZUTECH kompaniyasi Buxoro shahrida kichik do''kon sifatida o''z faoliyatini boshladi. Dastlabki kunlardan boshlab sifatli mahsulotlar va yuqori darajadagi xizmat ko''rsatish bizning asosiy maqsadimiz bo''ldi.',
 'Компания ORZUTECH начала свою деятельность в Бухаре как небольшой магазин. С первых дней качественные продукты и высокий уровень обслуживания стали нашей главной целью.',
 'ORZUTECH company started its activity in Bukhara as a small store. From the very first days, quality products and high-level service became our main goal.',
 1),
(2012, 'Birinchi kengayish', 'Первое расширение', 'First Expansion',
 'Mijozlar sonining ortishi bilan yangi filiallar ochildi. Buxoro viloyatining turli tumanlarida do''konlarimiz paydo bo''ldi va xizmat ko''rsatish geografiyasi kengaydi.',
 'С ростом числа клиентов открылись новые филиалы. Наши магазины появились в разных районах Бухарской области, и география обслуживания расширилась.',
 'With the growth of customers, new branches were opened. Our stores appeared in various districts of Bukhara region, and the service geography expanded.',
 2),
(2015, 'Xavfsizlik tizimlari', 'Системы безопасности', 'Security Systems',
 'Kuzatuv kamerasi va xavfsizlik tizimlariga ixtisoslashgan bo''lim ochildi. Professional o''rnatish va texnik xizmat ko''rsatish bo''yicha tajribali mutaxassislar jamoasi shakllandi.',
 'Открылось подразделение, специализирующееся на системах видеонаблюдения и безопасности. Сформировалась команда опытных специалистов по профессиональной установке и техническому обслуживанию.',
 'A division specializing in surveillance cameras and security systems was opened. A team of experienced specialists in professional installation and technical service was formed.',
 3),
(2025, 'Maishiy texnika', 'Бытовая техника', 'Home Appliances',
 'Kompaniya faoliyati kengayib, maishiy texnika do''koni ochildi. Endi mijozlarimiz bir joyda barcha zamonaviy texnikalarni sotib olishlari mumkin.',
 'Деятельность компании расширилась, открылся магазин бытовой техники. Теперь наши клиенты могут приобрести всю современную технику в одном месте.',
 'The company expanded its activities, opening a home appliance store. Now our customers can purchase all modern appliances in one place.',
 4);

-- Insert default services data
INSERT INTO company_services (title_uz, title_ru, title_en, description_uz, description_ru, description_en, bullet_points_uz, bullet_points_ru, bullet_points_en, sort_order) VALUES
('Sifatli xizmat ko''rsatish', 'Качественное обслуживание', 'Quality Service',
 'Bizning kompaniyamiz har bir mijozga individual yondashuv va yuqori sifatli xizmat ko''rsatishni kafolatlaydi. Tajribali mutaxassislarimiz sizga eng yaxshi maslahat beradi va kerakli yechimni topishda yordam beradi.',
 'Наша компания гарантирует индивидуальный подход и высококачественное обслуживание каждому клиенту. Наши опытные специалисты дадут вам лучший совет и помогут найти нужное решение.',
 'Our company guarantees an individual approach and high-quality service to every customer. Our experienced specialists will give you the best advice and help you find the right solution.',
 ARRAY['Professional maslahat', 'Individual yondashuv', 'Yuqori sifat kafolati'],
 ARRAY['Профессиональная консультация', 'Индивидуальный подход', 'Гарантия высокого качества'],
 ARRAY['Professional consultation', 'Individual approach', 'High quality guarantee'],
 1),
('Har bir mahsulot uchun kafolat xizmati', 'Гарантийное обслуживание', 'Warranty Service',
 'Bizdan sotib olingan barcha mahsulotlar rasmiy kafolat bilan ta''minlanadi. Kafolat muddati davomida bepul ta''mirlash va almashtirish xizmati ko''rsatamiz. Shuningdek, kafolat muddati tugagandan keyin ham arzon narxlarda ta''mirlash xizmatini taklif etamiz.',
 'Все продукты, приобретенные у нас, обеспечены официальной гарантией. В течение гарантийного срока предоставляем бесплатный ремонт и замену. Также предлагаем ремонт по доступным ценам после истечения гарантийного срока.',
 'All products purchased from us come with an official warranty. We provide free repair and replacement during the warranty period. We also offer repair services at affordable prices after the warranty expires.',
 ARRAY['Rasmiy kafolat', 'Bepul ta''mirlash', 'Tez almashtirish'],
 ARRAY['Официальная гарантия', 'Бесплатный ремонт', 'Быстрая замена'],
 ARRAY['Official warranty', 'Free repair', 'Quick replacement'],
 2),
('Turli xil zamonaviy noutbuk va kompyuterlar savdosi', 'Продажа ноутбуков и компьютеров', 'Laptops and Computers Sales',
 'Bizda eng so''nggi model noutbuklar va kompyuterlar mavjud. Ish uchun, o''yin uchun yoki ta''lim uchun – har qanday maqsad uchun mos keladigan qurilmani topishingiz mumkin. Barcha mashhur brendlarning mahsulotlari mavjud.',
 'У нас есть новейшие модели ноутбуков и компьютеров. Для работы, игр или учебы – вы можете найти устройство для любых целей. Доступны продукты всех популярных брендов.',
 'We have the latest laptop and computer models. For work, gaming, or education – you can find a device for any purpose. Products from all popular brands are available.',
 ARRAY['Eng yangi modellar', 'Barcha brendlar', 'Raqobatbardosh narxlar'],
 ARRAY['Новейшие модели', 'Все бренды', 'Конкурентные цены'],
 ARRAY['Latest models', 'All brands', 'Competitive prices'],
 3),
('Turli brend va modeldagi smartfonlar va aksessuarlar', 'Смартфоны и аксессуары', 'Smartphones and Accessories',
 'Eng mashhur brendlarning smartfonlari: Samsung, Huawei, Xiaomi, iPhone va boshqalar. Shuningdek, barcha turdagi aksessuarlar: qopqichlar, himoya oynalari, zaryadlovchilar, quloqchinlar va boshqa kerakli buyumlar mavjud.',
 'Смартфоны самых популярных брендов: Samsung, Huawei, Xiaomi, iPhone и другие. Также все виды аксессуаров: чехлы, защитные стекла, зарядные устройства, наушники и другие необходимые товары.',
 'Smartphones from the most popular brands: Samsung, Huawei, Xiaomi, iPhone and others. Also all types of accessories: cases, protective glasses, chargers, headphones and other necessary items.',
 ARRAY['Barcha mashhur brendlar', 'Keng aksessuarlar tanlovi', 'Rasmiy kafolat'],
 ARRAY['Все популярные бренды', 'Широкий выбор аксессуаров', 'Официальная гарантия'],
 ARRAY['All popular brands', 'Wide selection of accessories', 'Official warranty'],
 4),
('Ofis va uy uchun xavfsizlik kameralari va o''rnatish xizmati', 'Камеры безопасности и установка', 'Security Cameras and Installation',
 'Yuqori sifatli xavfsizlik kameralari va professional o''rnatish xizmati. Ofis, do''kon, uy yoki boshqa ob''ektlar uchun to''liq xavfsizlik tizimini o''rnatamiz. 24/7 monitoring va masofadan boshqarish imkoniyati mavjud.',
 'Высококачественные камеры безопасности и профессиональная установка. Устанавливаем полную систему безопасности для офиса, магазина, дома или других объектов. Доступен мониторинг 24/7 и удаленное управление.',
 'High-quality security cameras and professional installation service. We install complete security systems for office, store, home or other facilities. 24/7 monitoring and remote control available.',
 ARRAY['Professional o''rnatish', '24/7 monitoring', 'Masofadan boshqarish'],
 ARRAY['Профессиональная установка', 'Мониторинг 24/7', 'Удаленное управление'],
 ARRAY['Professional installation', '24/7 monitoring', 'Remote control'],
 5),
('Buxoro bo''ylab tez va ishonchli yetkazib berish xizmati', 'Быстрая доставка по Бухаре', 'Fast Delivery in Bukhara',
 '24 soat ichida Buxoro shahrining istalgan nuqtasiga yetkazib berish xizmati. 1 000 000 so''mdan yuqori xaridlar uchun bepul yetkazib berish. Mahsulotlarning xavfsizligi va buzilmasligini kafolatlaymiz.',
 'Доставка в любую точку Бухары в течение 24 часов. Бесплатная доставка для покупок свыше 1 000 000 сум. Гарантируем сохранность и целостность товаров.',
 'Delivery to any point in Bukhara within 24 hours. Free delivery for purchases over 1,000,000 sum. We guarantee the safety and integrity of products.',
 ARRAY['24 soat ichida yetkazish', 'Bepul yetkazish (1 mln so''mdan)', 'Xavfsiz tashish'],
 ARRAY['Доставка в течение 24 часов', 'Бесплатная доставка (от 1 млн сум)', 'Безопасная транспортировка'],
 ARRAY['Delivery within 24 hours', 'Free delivery (from 1M sum)', 'Safe transportation'],
 6),
('Uyda qulaylik yaratish uchun kerak bo''lgan barcha zamonaviy jihozlar', 'Бытовая техника для дома', 'Home Appliances',
 'Maishiy texnikalarning to''liq assortimenti: muzlatgichlar, kir yuvish mashinalari, konditsionerlar, televizorlar, mikroto''lqinli pechlar va boshqa barcha kerakli jihozlar. Uyingizni zamonaviy va qulay qilish uchun hamma narsa bir joyda!',
 'Полный ассортимент бытовой техники: холодильники, стиральные машины, кондиционеры, телевизоры, микроволновые печи и все другие необходимые приборы. Всё для современного и комфортного дома в одном месте!',
 'Full range of home appliances: refrigerators, washing machines, air conditioners, TVs, microwaves and all other necessary appliances. Everything to make your home modern and comfortable in one place!',
 ARRAY['To''liq assortiment', 'Energiya tejovchi modellar', 'O''rnatish va sozlash'],
 ARRAY['Полный ассортимент', 'Энергосберегающие модели', 'Установка и настройка'],
 ARRAY['Full range', 'Energy-saving models', 'Installation and setup'],
 7);

-- Insert default achievements
INSERT INTO company_achievements (title_uz, title_ru, title_en, icon, value, sort_order) VALUES
('Eng yaxshi texnika do''koni', 'Лучший магазин техники', 'Best Tech Store', 'Trophy', '2023', 1),
('Mamnun mijozlar', 'Довольные клиенты', 'Satisfied Customers', 'Users', '30,000+', 2),
('Filiallar', 'Филиалы', 'Branches', 'Building', '5', 3),
('Innovatsion yechimlar', 'Инновационные решения', 'Innovative Solutions', 'Lightbulb', '', 4),
('Premium brendlar', 'Премиум бренды', 'Premium Brands', 'Star', '', 5),
('Sifat kafolati', 'Гарантия качества', 'Quality Guarantee', 'Shield', '', 6);

-- Insert default why choose us
INSERT INTO why_choose_us (title_uz, title_ru, title_en, description_uz, description_ru, description_en, icon, sort_order) VALUES
('Sifat kafolati', 'Гарантия качества', 'Quality Guarantee', 'Barcha mahsulotlar rasmiy kafolat bilan', 'Все товары с официальной гарантией', 'All products with official warranty', 'Shield', 1),
('Tez xizmat', 'Быстрый сервис', 'Fast Service', '24 soat ichida yetkazib berish', 'Доставка в течение 24 часов', 'Delivery within 24 hours', 'Zap', 2),
('Professional maslahat', 'Профессиональная консультация', 'Professional Consultation', 'Tajribali mutaxassislar jamoasi', 'Команда опытных специалистов', 'Team of experienced specialists', 'MessageCircle', 3),
('Ishonchli hamkor', 'Надежный партнер', 'Reliable Partner', '17 yildan ortiq tajriba', 'Более 17 лет опыта', 'Over 17 years of experience', 'Handshake', 4),
('Keng assortiment', 'Широкий ассортимент', 'Wide Range', 'Barcha turdagi texnikalar', 'Все виды техники', 'All types of appliances', 'Package', 5),
('Qulay narxlar', 'Доступные цены', 'Affordable Prices', 'Raqobatbardosh narx siyosati', 'Конкурентная ценовая политика', 'Competitive pricing policy', 'BadgePercent', 6);

-- Insert default partner brands
INSERT INTO partner_brands (name, sort_order) VALUES
('Samsung', 1),
('Huawei', 2),
('LG', 3),
('Canon', 4),
('Artel', 5),
('Dahua', 6),
('Epson', 7),
('Ezviz', 8),
('Hikvision', 9),
('HiLook', 10),
('Hofman', 11),
('Honor', 12),
('Infinix', 13),
('Novey', 14),
('Premier', 15),
('Xiaomi', 16),
('Tecno', 17),
('VIVO', 18);

-- Insert default team info
INSERT INTO company_team (title_uz, title_ru, title_en, description_uz, description_ru, description_en, stats) VALUES
('Professional jamoa', 'Профессиональная команда', 'Professional Team',
 'Bizning jamoamiz texnologiya sohasida ko''p yillik tajribaga ega mutaxassislardan tashkil topgan. Har bir xodimimiz o''z ishini sevadi va mijozlarimizga eng yaxshi xizmat ko''rsatishga intiladi.',
 'Наша команда состоит из специалистов с многолетним опытом в сфере технологий. Каждый наш сотрудник любит свою работу и стремится предоставить лучший сервис нашим клиентам.',
 'Our team consists of specialists with many years of experience in technology. Each of our employees loves their work and strives to provide the best service to our customers.',
 '[{"value": "80+", "label_uz": "Xodimlar", "label_ru": "Сотрудники", "label_en": "Employees"}, {"value": "17", "label_uz": "Yillik tajriba", "label_ru": "Лет опыта", "label_en": "Years Experience"}, {"value": "100%", "label_uz": "Professional", "label_ru": "Профессионал", "label_en": "Professional"}]');

-- Insert default page sections
INSERT INTO corporate_page_sections (page_type, section_key, title_uz, title_ru, title_en, subtitle_uz, subtitle_ru, subtitle_en, content_uz, content_ru, content_en, sort_order) VALUES
('about', 'hero', 'Biz haqimizda', 'О нас', 'About Us', 
 'ORZUTECH – Sizning ishonchli texnologiya hamkoringiz', 
 'ORZUTECH – Ваш надежный технологический партнер', 
 'ORZUTECH – Your Reliable Technology Partner', '', '', '', 1),
('about', 'video', 'Kompaniya to''g''risidagi video', 'Видео о компании', 'Company Video', '', '', '', '', '', '', 5),
('services', 'hero', 'Xizmatlarimiz', 'Наши услуги', 'Our Services', 
 'Sifatli xizmat – bizning asosiy maqsadimiz', 
 'Качественный сервис – наша главная цель', 
 'Quality service – our main goal', '', '', '', 1),
('services', 'cta', 'Bizning xizmatlarimizdan foydalanishga tayyormisiz?', 'Готовы воспользоваться нашими услугами?', 'Ready to use our services?',
 'Har qanday savol yoki buyurtma uchun biz bilan bog''laning. Mutaxassislarimiz sizga yordam berishga doim tayyor!',
 'Свяжитесь с нами по любым вопросам или заказам. Наши специалисты всегда готовы вам помочь!',
 'Contact us for any questions or orders. Our specialists are always ready to help you!', '', '', '', 10),
('contact', 'hero', 'Aloqa', 'Контакты', 'Contact',
 'Biz bilan bog''laning – sizning savollaringizga javob berishga tayyormiz',
 'Свяжитесь с нами – мы готовы ответить на ваши вопросы',
 'Contact us – we are ready to answer your questions', '', '', '', 1),
('contact', 'info', 'Aloqa ma''lumotlari', 'Контактная информация', 'Contact Information', '', '', '',
 'Telefon: +998 65 200 00 02\nEmail: info@orzutech.uz\nTelegram: @orzutech_uz\nInstagram: @orzutech_official',
 'Телефон: +998 65 200 00 02\nEmail: info@orzutech.uz\nTelegram: @orzutech_uz\nInstagram: @orzutech_official',
 'Phone: +998 65 200 00 02\nEmail: info@orzutech.uz\nTelegram: @orzutech_uz\nInstagram: @orzutech_official', 2),
('contact', 'hours', 'Ish vaqti', 'Время работы', 'Working Hours', '', '', '',
 'Do''konlar: 9:00 – 20:00 (har kuni)\nTelefon qo''llab-quvvatlash: Dushanba–Shanba\nOnline qo''llab-quvvatlash: 24/7 (Telegram)',
 'Магазины: 9:00 – 20:00 (ежедневно)\nТелефонная поддержка: Понедельник–Суббота\nОнлайн поддержка: 24/7 (Telegram)',
 'Stores: 9:00 – 20:00 (daily)\nPhone support: Monday–Saturday\nOnline support: 24/7 (Telegram)', 3);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_corporate_sections_page ON corporate_page_sections(page_type);
CREATE INDEX IF NOT EXISTS idx_timeline_year ON company_timeline(year);
CREATE INDEX IF NOT EXISTS idx_services_sort ON company_services(sort_order);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_unread ON contact_messages(is_read) WHERE is_read = false;
