import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Shield,
  Laptop,
  Smartphone,
  Camera,
  Truck,
  Home,
  Phone,
  ShoppingCart,
  ChevronRight,
  Wrench
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

interface Service {
  id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  bullet_points_uz: string[];
  bullet_points_ru: string[];
  bullet_points_en: string[];
  image_url: string | null;
  icon: string;
  sort_order: number;
}

interface PageSection {
  section_key: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  subtitle_uz: string;
  subtitle_ru: string;
  subtitle_en: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle,
  Shield,
  Laptop,
  Smartphone,
  Camera,
  Truck,
  Home,
  Wrench,
};

export default function Services() {
  const { language, getLocalizedField } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [heroSection, setHeroSection] = useState<PageSection | null>(null);
  const [ctaSection, setCtaSection] = useState<PageSection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: servicesData }, { data: sectionsData }] = await Promise.all([
      supabase.from('company_services').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('corporate_page_sections').select('*').eq('page_type', 'services').eq('is_active', true)
    ]);

    if (servicesData) setServices(servicesData);
    if (sectionsData) {
      const hero = sectionsData.find(s => s.section_key === 'hero');
      const cta = sectionsData.find(s => s.section_key === 'cta');
      if (hero) setHeroSection(hero);
      if (cta) setCtaSection(cta);
    }
    setLoading(false);
  };

  const getIcon = (iconName: string) => {
    return iconMap[iconName] || CheckCircle;
  };

  const getBulletPoints = (service: Service) => {
    if (language === 'uz') return service.bullet_points_uz || [];
    if (language === 'ru') return service.bullet_points_ru || [];
    return service.bullet_points_en || [];
  };

  const getServiceIcon = (index: number) => {
    const icons = [CheckCircle, Shield, Laptop, Smartphone, Camera, Truck, Home];
    return icons[index % icons.length];
  };

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
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-600 rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
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
              <Wrench className="w-10 h-10 text-orange-400" />
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {heroSection ? getLocalizedField(heroSection, 'title') : 'Xizmatlarimiz'}
            </h1>
            <p className="text-xl md:text-2xl text-orange-400 max-w-3xl mx-auto">
              {heroSection ? getLocalizedField(heroSection, 'subtitle') : 'Sifatli xizmat – bizning asosiy maqsadimiz'}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          {services.map((service, index) => {
            const Icon = getServiceIcon(index);
            const bulletPoints = getBulletPoints(service);
            const isReversed = index % 2 === 1;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 py-16 ${
                  index !== services.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="w-full lg:w-1/2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="relative"
                  >
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={getLocalizedField(service, 'title')}
                        className="w-full h-80 lg:h-96 object-cover rounded-2xl shadow-2xl"
                      />
                    ) : (
                      <div className="w-full h-80 lg:h-96 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-2xl flex items-center justify-center">
                        <Icon className="w-24 h-24 text-white/30" />
                      </div>
                    )}

                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-500 rounded-2xl flex items-center justify-center shadow-xl">
                      <span className="text-3xl font-bold text-white">0{index + 1}</span>
                    </div>
                  </motion.div>
                </div>

                <div className="w-full lg:w-1/2">
                  <motion.div
                    initial={{ opacity: 0, x: isReversed ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                        {getLocalizedField(service, 'title')}
                      </h2>
                    </div>

                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                      {getLocalizedField(service, 'description')}
                    </p>

                    {bulletPoints.length > 0 && (
                      <ul className="space-y-4">
                        {bulletPoints.map((point, pointIndex) => (
                          <motion.li
                            key={pointIndex}
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 + pointIndex * 0.1 }}
                            className="flex items-center gap-3"
                          >
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-gray-700 font-medium">{point}</span>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '30px 30px'
          }} />
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {ctaSection ? getLocalizedField(ctaSection, 'title') :
                (language === 'uz' ? 'Bizning xizmatlarimizdan foydalanishga tayyormisiz?' :
                 language === 'ru' ? 'Готовы воспользоваться нашими услугами?' :
                 'Ready to use our services?')}
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              {ctaSection ? getLocalizedField(ctaSection, 'subtitle') :
                (language === 'uz' ? 'Har qanday savol yoki buyurtma uchun biz bilan bog\'laning. Mutaxassislarimiz sizga yordam berishga doim tayyor!' :
                 language === 'ru' ? 'Свяжитесь с нами по любым вопросам или заказам. Наши специалисты всегда готовы вам помочь!' :
                 'Contact us for any questions or orders. Our specialists are always ready to help you!')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.a
                href="tel:+998652000002"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-orange-600 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Phone className="w-5 h-5" />
                {language === 'uz' ? 'Qo\'ng\'iroq qiling' : language === 'ru' ? 'Позвоните нам' : 'Call Us'}
              </motion.a>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {language === 'uz' ? 'Online xarid qiling' : language === 'ru' ? 'Купить онлайн' : 'Shop Online'}
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
