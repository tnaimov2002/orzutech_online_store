import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Banner } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';

export default function BannerSlider() {
  const { t, getLocalizedField } = useLanguage();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (data) setBanners(data);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative h-[400px] md:h-[500px] overflow-hidden rounded-3xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentBanner.image_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20 md:from-black/70 md:via-black/40 md:to-transparent" />
          </div>

          <div className="relative h-full flex items-center justify-center md:justify-start">
            <div className="w-full max-w-7xl mx-auto px-4 flex justify-center md:justify-start md:pl-[15%] lg:pl-[20%]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="max-w-xl text-white text-center md:text-left"
              >
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight"
                >
                  {getLocalizedField(currentBanner, 'title')}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="text-base sm:text-lg md:text-xl text-white/80 mb-8"
                >
                  {getLocalizedField(currentBanner, 'subtitle')}
                </motion.p>
                {currentBanner.link_url && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                  >
                    <Link to={currentBanner.link_url}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold text-lg shadow-lg shadow-orange-500/30 transition-colors"
                      >
                        {t.home.shopNow}
                      </motion.button>
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
