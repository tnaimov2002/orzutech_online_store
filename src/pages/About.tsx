import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Trophy,
  Users,
  Building,
  Lightbulb,
  Star,
  Shield,
  Zap,
  MessageCircle,
  Handshake,
  Package,
  BadgePercent,
  Play
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

interface TimelineEntry {
  id: string;
  year: number;
  title_uz: string;
  title_ru: string;
  title_en: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  image_url: string | null;
}

interface Achievement {
  id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  icon: string;
  value: string | null;
}

interface WhyChooseUs {
  id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  icon: string;
}

interface TeamInfo {
  id: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  description_uz: string;
  description_ru: string;
  description_en: string;
  image_url: string | null;
  stats: { value: string; label_uz: string; label_ru: string; label_en: string }[];
}

interface PageSection {
  section_key: string;
  title_uz: string;
  title_ru: string;
  title_en: string;
  subtitle_uz: string;
  subtitle_ru: string;
  subtitle_en: string;
  video_url: string | null;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Users,
  Building,
  Lightbulb,
  Star,
  Shield,
  Zap,
  MessageCircle,
  Handshake,
  Package,
  BadgePercent,
  Award: Trophy,
};

function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const numericValue = parseInt(value.replace(/\D/g, '')) || 0;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView && numericValue > 0) {
      const duration = 2000;
      const steps = 60;
      const increment = numericValue / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setCount(numericValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, numericValue]);

  const displayValue = value.includes('+') ? `${count}+` : value.includes('%') ? `${count}%` : count.toString();

  return (
    <span ref={ref} className="text-4xl md:text-5xl font-bold text-orange-500">
      {isInView ? displayValue : '0'}{suffix}
    </span>
  );
}

export default function About() {
  const { language, getLocalizedField } = useLanguage();
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [whyChooseUs, setWhyChooseUs] = useState<WhyChooseUs[]>([]);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [heroSection, setHeroSection] = useState<PageSection | null>(null);
  const [videoSection, setVideoSection] = useState<PageSection | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [
      { data: timelineData },
      { data: achievementsData },
      { data: whyData },
      { data: teamData },
      { data: sectionsData },
      { data: brandsData }
    ] = await Promise.all([
      supabase.from('company_timeline').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('company_achievements').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('why_choose_us').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('company_team').select('*').eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('corporate_page_sections').select('*').eq('page_type', 'about').eq('is_active', true),
      supabase.from('partner_brands').select('*').eq('is_active', true).order('sort_order')
    ]);

    if (timelineData) setTimeline(timelineData);
    if (achievementsData) setAchievements(achievementsData);
    if (whyData) setWhyChooseUs(whyData);
    if (teamData) setTeamInfo(teamData);
    if (sectionsData) {
      const hero = sectionsData.find(s => s.section_key === 'hero');
      const video = sectionsData.find(s => s.section_key === 'video');
      if (hero) setHeroSection(hero);
      if (video) setVideoSection(video);
    }
    if (brandsData) setBrands(brandsData);
    setLoading(false);
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || Star;
    return Icon;
  };

  const extractYouTubeId = (url: string | null) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
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
          <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-600 rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              {heroSection ? getLocalizedField(heroSection, 'title') : 'Biz haqimizda'}
            </h1>
            <p className="text-xl md:text-2xl text-orange-400 max-w-3xl mx-auto">
              {heroSection ? getLocalizedField(heroSection, 'subtitle') : 'ORZUTECH – Sizning ishonchli texnologiya hamkoringiz'}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16"
          >
            {language === 'uz' ? 'Kompaniya tarixi' : language === 'ru' ? 'История компании' : 'Company History'}
          </motion.h2>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-orange-500 to-orange-300 hidden md:block" />

            {timeline.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative flex flex-col md:flex-row items-center mb-12 ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                <div className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                    <span className="inline-block px-4 py-2 bg-orange-500 text-white font-bold rounded-full mb-4">
                      {entry.year}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {getLocalizedField(entry, 'title')}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {getLocalizedField(entry, 'description')}
                    </p>
                  </div>
                </div>

                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-orange-500 rounded-full border-4 border-white shadow-lg hidden md:block" />

                <div className={`w-full md:w-1/2 mt-4 md:mt-0 ${index % 2 === 0 ? 'md:pl-12' : 'md:pr-12'}`}>
                  {entry.image_url ? (
                    <img
                      src={entry.image_url}
                      alt={getLocalizedField(entry, 'title')}
                      className="w-full h-48 object-cover rounded-2xl shadow-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center">
                      <Building className="w-16 h-16 text-orange-300" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {teamInfo && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-2 md:order-1"
              >
                {teamInfo.image_url ? (
                  <img
                    src={teamInfo.image_url}
                    alt="Team"
                    className="w-full h-80 object-cover rounded-2xl shadow-xl"
                  />
                ) : (
                  <div className="w-full h-80 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
                    <Users className="w-24 h-24 text-white/50" />
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="order-1 md:order-2"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  {getLocalizedField(teamInfo, 'title')}
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  {getLocalizedField(teamInfo, 'description')}
                </p>

                <div className="grid grid-cols-3 gap-4">
                  {teamInfo.stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="text-center p-4 bg-white rounded-xl shadow-md"
                    >
                      <AnimatedCounter value={stat.value} />
                      <p className="text-sm text-gray-600 mt-2">
                        {language === 'uz' ? stat.label_uz : language === 'ru' ? stat.label_ru : stat.label_en}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {videoSection?.video_url && (
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12"
            >
              {getLocalizedField(videoSection, 'title')}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video"
            >
              {extractYouTubeId(videoSection.video_url) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(videoSection.video_url)}`}
                  title="Company Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <Play className="w-20 h-20 text-white/50" />
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center text-white mb-16"
          >
            {language === 'uz' ? 'Bizning yutuqlarimiz' : language === 'ru' ? 'Наши достижения' : 'Our Achievements'}
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {achievements.map((achievement, index) => {
              const Icon = getIcon(achievement.icon);
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10 hover:border-orange-500/50 transition-all"
                >
                  <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-orange-400" />
                  </div>
                  {achievement.value && (
                    <p className="text-2xl font-bold text-orange-400 mb-2">{achievement.value}</p>
                  )}
                  <p className="text-sm text-gray-300 font-medium">
                    {getLocalizedField(achievement, 'title')}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16"
          >
            {language === 'uz' ? 'Nega bizni tanlashadi?' : language === 'ru' ? 'Почему выбирают нас?' : 'Why Choose Us?'}
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyChooseUs.map((item, index) => {
              const Icon = getIcon(item.icon);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:border-orange-200 transition-all"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {getLocalizedField(item, 'title')}
                  </h3>
                  <p className="text-gray-600">
                    {getLocalizedField(item, 'description')}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16"
          >
            {language === 'uz' ? 'Bizning hamkor brendlarimiz' : language === 'ru' ? 'Наши партнерские бренды' : 'Our Partner Brands'}
          </motion.h2>

          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-6">
            {brands.map((brand, index) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.1 }}
                className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all flex items-center justify-center h-20"
              >
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-sm font-semibold text-gray-600 text-center">{brand.name}</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
