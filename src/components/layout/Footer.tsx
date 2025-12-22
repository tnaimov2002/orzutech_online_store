import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, Youtube, Send, Shield, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAdmin } from '../../context/AdminContext';

const storeLocations = [
  {
    key: 'main',
    coords: '39.7747,64.4286',
    query: 'Navoiy street 15, Bukhara, Uzbekistan',
  },
  {
    key: 'store2',
    coords: '39.7712,64.4198',
    query: 'Ibn Sino street 28, Bukhara, Uzbekistan',
  },
  {
    key: 'store3',
    coords: '39.7689,64.4352',
    query: 'Mustaqillik street 45, Bukhara, Uzbekistan',
  },
  {
    key: 'store4',
    coords: '39.7801,64.4156',
    query: 'Bukhara City Mall, Bukhara, Uzbekistan',
  },
  {
    key: 'store5',
    coords: '39.7156,64.5489',
    query: 'Central Market, Kogon, Bukhara, Uzbekistan',
  },
];

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

  const getGoogleMapsUrl = (query: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10">
          <div className="lg:col-span-1">
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
            <p className="text-gray-400 leading-relaxed mb-6 text-sm">
              {t.footer.aboutText}
            </p>
            <div className="flex gap-3">
              {[Facebook, Instagram, Youtube, Send].map((Icon, index) => (
                <motion.a
                  key={index}
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-orange-500 transition-colors"
                >
                  <Icon className="w-4 h-4" />
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
                    className="text-gray-400 hover:text-orange-500 transition-colors inline-flex items-center gap-2 text-sm"
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
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <a href="tel:+998652210000" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  {t.nav.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <a href="mailto:info@orzutech.uz" className="text-gray-400 hover:text-orange-500 transition-colors text-sm">
                  info@orzutech.uz
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-gray-400 text-sm">{t.footer.workingHours}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">{t.footer.ourStores}</h3>
            <ul className="space-y-3">
              {storeLocations.map((store) => (
                <li key={store.key}>
                  <motion.a
                    href={getGoogleMapsUrl(store.query)}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 3 }}
                    className="group flex items-start gap-2 text-gray-400 hover:text-orange-500 transition-all text-sm"
                  >
                    <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="flex-1">
                      {t.footer.stores[store.key as keyof typeof t.footer.stores]}
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                  </motion.a>
                </li>
              ))}
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
                className="w-full px-4 py-3 bg-white/10 rounded-lg border border-white/20 focus:border-orange-500 focus:outline-none text-white placeholder-gray-500 text-sm"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-shadow text-sm"
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
