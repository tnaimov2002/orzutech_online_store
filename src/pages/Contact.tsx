import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

interface StoreLocation {
  id: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
  address_uz: string;
  address_ru: string;
  address_en: string;
  working_hours: string;
  phone: string | null;
  maps_url: string | null;
}

interface PageSection {
  section_key: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  subtitle_uz: string;
  subtitle_ru: string;
  subtitle_en: string;
  content_uz: string;
  content_ru: string;
  content_en: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

export default function Contact() {
  const { language, getLocalizedField } = useLanguage();
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [heroSection, setHeroSection] = useState<PageSection | null>(null);
  const [infoSection, setInfoSection] = useState<PageSection | null>(null);
  const [hoursSection, setHoursSection] = useState<PageSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: storesData }, { data: sectionsData }] = await Promise.all([
      supabase.from('store_locations').select('*').eq('is_active', true),
      supabase.from('corporate_page_sections').select('*').eq('page_type', 'contact').eq('is_active', true)
    ]);

    if (storesData) setStores(storesData);
    if (sectionsData) {
      const hero = sectionsData.find(s => s.section_key === 'hero');
      const info = sectionsData.find(s => s.section_key === 'info');
      const hours = sectionsData.find(s => s.section_key === 'hours');
      if (hero) setHeroSection(hero);
      if (info) setInfoSection(info);
      if (hours) setHoursSection(hours);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    const { error } = await supabase.from('contact_messages').insert({
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone: formData.phone,
      email: formData.email || null,
      subject: formData.subject,
      message: formData.message
    });

    if (error) {
      setSubmitError(language === 'uz' ? 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.' :
        language === 'ru' ? 'Произошла ошибка. Попробуйте еще раз.' : 'An error occurred. Please try again.');
    } else {
      setSubmitSuccess(true);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        subject: '',
        message: ''
      });
      setTimeout(() => setSubmitSuccess(false), 5000);
    }
    setSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactInfo = {
    phone: '+998 65 200 00 02',
    email: 'info@orzutech.uz',
    telegram: '@orzutech_uz',
    instagram: '@orzutech_official'
  };

  const subjectOptions = language === 'uz'
    ? ['Umumiy savol', 'Buyurtma haqida', 'Texnik yordam', 'Hamkorlik', 'Boshqa']
    : language === 'ru'
    ? ['Общий вопрос', 'О заказе', 'Техническая поддержка', 'Сотрудничество', 'Другое']
    : ['General Question', 'About Order', 'Technical Support', 'Partnership', 'Other'];

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16">
      <section className="relative py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/2 w-96 h-96 bg-orange-500 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600 rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8"
            >
              <MessageCircle className="w-10 h-10 text-orange-400" />
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {heroSection ? getLocalizedField(heroSection, 'title') : 'Aloqa'}
            </h1>
            <p className="text-xl md:text-2xl text-orange-400 max-w-3xl mx-auto">
              {heroSection ? getLocalizedField(heroSection, 'subtitle') :
                (language === 'uz' ? 'Biz bilan bog\'laning – sizning savollaringizga javob berishga tayyormiz' :
                 language === 'ru' ? 'Свяжитесь с нами – мы готовы ответить на ваши вопросы' :
                 'Contact us – we are ready to answer your questions')}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 text-white"
            >
              <Phone className="w-10 h-10 mb-6" />
              <h3 className="text-xl font-bold mb-4">
                {language === 'uz' ? 'Telefon' : language === 'ru' ? 'Телефон' : 'Phone'}
              </h3>
              <a href={`tel:${contactInfo.phone.replace(/\s/g, '')}`} className="text-2xl font-bold hover:underline">
                {contactInfo.phone}
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg"
            >
              <Mail className="w-10 h-10 text-orange-500 mb-6" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">Email</h3>
              <a href={`mailto:${contactInfo.email}`} className="text-lg text-gray-600 hover:text-orange-500 transition-colors">
                {contactInfo.email}
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg"
            >
              <MessageCircle className="w-10 h-10 text-orange-500 mb-6" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {language === 'uz' ? 'Ijtimoiy tarmoqlar' : language === 'ru' ? 'Социальные сети' : 'Social Media'}
              </h3>
              <div className="space-y-2">
                <a href={`https://t.me/${contactInfo.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                   className="block text-gray-600 hover:text-orange-500 transition-colors">
                  Telegram: {contactInfo.telegram}
                </a>
                <a href={`https://instagram.com/${contactInfo.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                   className="block text-gray-600 hover:text-orange-500 transition-colors">
                  Instagram: {contactInfo.instagram}
                </a>
              </div>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                {language === 'uz' ? 'Xabar yuboring' : language === 'ru' ? 'Отправить сообщение' : 'Send a Message'}
              </h2>

              <AnimatePresence>
                {submitSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
                  >
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <p className="text-green-700 font-medium">
                      {language === 'uz' ? 'Xabaringiz muvaffaqiyatli yuborildi!' :
                       language === 'ru' ? 'Ваше сообщение успешно отправлено!' :
                       'Your message has been sent successfully!'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700">{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {language === 'uz' ? 'Ism' : language === 'ru' ? 'Имя' : 'First Name'} *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                      placeholder={language === 'uz' ? 'Ismingiz' : language === 'ru' ? 'Ваше имя' : 'Your first name'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {language === 'uz' ? 'Familiya' : language === 'ru' ? 'Фамилия' : 'Last Name'} *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                      placeholder={language === 'uz' ? 'Familiyangiz' : language === 'ru' ? 'Ваша фамилия' : 'Your last name'}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {language === 'uz' ? 'Telefon' : language === 'ru' ? 'Телефон' : 'Phone'} *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                      placeholder="+998 90 123 45 67"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                      placeholder="example@mail.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {language === 'uz' ? 'Mavzu' : language === 'ru' ? 'Тема' : 'Subject'} *
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors bg-white"
                  >
                    <option value="">{language === 'uz' ? 'Mavzuni tanlang' : language === 'ru' ? 'Выберите тему' : 'Select a subject'}</option>
                    {subjectOptions.map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {language === 'uz' ? 'Xabar matni' : language === 'ru' ? 'Текст сообщения' : 'Message'} *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors resize-none"
                    placeholder={language === 'uz' ? 'Xabaringizni yozing...' : language === 'ru' ? 'Напишите ваше сообщение...' : 'Write your message...'}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {language === 'uz' ? 'Yuborish' : language === 'ru' ? 'Отправить' : 'Send'}
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                {language === 'uz' ? 'Ish vaqti' : language === 'ru' ? 'Время работы' : 'Working Hours'}
              </h2>

              <div className="bg-gray-50 rounded-2xl p-8 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {language === 'uz' ? 'Do\'konlar' : language === 'ru' ? 'Магазины' : 'Stores'}
                      </p>
                      <p className="text-gray-600">9:00 – 20:00 ({language === 'uz' ? 'har kuni' : language === 'ru' ? 'ежедневно' : 'daily'})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Phone className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {language === 'uz' ? 'Telefon qo\'llab-quvvatlash' : language === 'ru' ? 'Телефонная поддержка' : 'Phone Support'}
                      </p>
                      <p className="text-gray-600">{language === 'uz' ? 'Dushanba–Shanba' : language === 'ru' ? 'Понедельник–Суббота' : 'Monday–Saturday'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {language === 'uz' ? 'Online qo\'llab-quvvatlash' : language === 'ru' ? 'Онлайн поддержка' : 'Online Support'}
                      </p>
                      <p className="text-gray-600">24/7 (Telegram)</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center text-gray-900 mb-12"
          >
            {language === 'uz' ? 'Bizning do\'konlarimiz' : language === 'ru' ? 'Наши магазины' : 'Our Stores'}
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store, index) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {getLocalizedField(store, 'name')}
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span>{getLocalizedField(store, 'address')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{store.working_hours}</span>
                  </div>

                  {store.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${store.phone}`} className="hover:text-orange-500 transition-colors">
                        {store.phone}
                      </a>
                    </div>
                  )}
                </div>

                {store.maps_url && (
                  <a
                    href={store.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-orange-500 font-medium hover:text-orange-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {language === 'uz' ? 'Xaritada ko\'rish' : language === 'ru' ? 'Посмотреть на карте' : 'View on Map'}
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
