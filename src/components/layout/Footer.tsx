import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Youtube, Send, Shield } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAdmin } from '../../context/AdminContext';

export default function Footer() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const handleAdminClick = () => {
    if (isAuthenticated) {
      navigate('/admin');
    } else {
      navigate('/admin/login');
    }
  };

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <motion.img
                src="/yulduz_orange.png"
                alt="ORZUTECH Logo"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="w-10 h-10 object-contain"
              />
              <span className="text-2xl font-bold text-orange-500 tracking-wide group-hover:opacity-80 transition-opacity">
                ORZUTECH
              </span>
            </Link>
            <p className="text-gray-400 leading-relaxed mb-6">
              {t.footer.aboutText}
            </p>
            <div className="flex gap-4">
              {[Facebook, Instagram, Youtube, Send].map((Icon, index) => (
                <motion.a
                  key={index}
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-orange-500 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">{t.footer.quickLinks}</h3>
            <ul className="space-y-3">
              {[
                { to: '/', label: t.nav.home },
                { to: '/products', label: t.nav.products },
                { to: '/cart', label: t.nav.cart },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-gray-400 hover:text-orange-500 transition-colors inline-flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">{t.footer.contact}</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">{t.footer.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <a href="tel:+998652210000" className="text-gray-400 hover:text-orange-500 transition-colors">
                  {t.nav.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <a href="mailto:info@orzutech.uz" className="text-gray-400 hover:text-orange-500 transition-colors">
                  info@orzutech.uz
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <span className="text-gray-400">{t.footer.workingHours}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">{t.common.newsletter}</h3>
            <p className="text-gray-400 mb-4 text-sm">
              {t.common.subscribeText}
            </p>
            <form className="space-y-3">
              <input
                type="email"
                placeholder={t.common.email}
                className="w-full px-4 py-3 bg-white/10 rounded-lg border border-white/20 focus:border-orange-500 focus:outline-none text-white placeholder-gray-500"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-shadow"
              >
                {t.common.subscribe}
              </motion.button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            {currentYear} ORZUTECH. {t.footer.rights}
          </p>
          <div className="flex items-center gap-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-6 opacity-50 hover:opacity-100 transition-opacity" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 opacity-50 hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 flex justify-center">
          <motion.button
            onClick={handleAdminClick}
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:text-orange-500 bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 rounded-lg transition-all duration-300"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t.common.adminPanel}</span>
          </motion.button>
        </div>
      </div>
    </footer>
  );
}
