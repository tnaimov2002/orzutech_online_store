import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, Globe, ChevronDown, Clock, AlertTriangle, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAdmin } from '../../context/AdminContext';
import { Language } from '../../types';

const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000;

export default function AdminLogin() {
  const { t, language, setLanguage } = useLanguage();
  const { login, isAuthenticated } = useAdmin();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const [loginAttempts, setLoginAttempts] = useState(() => {
    const saved = localStorage.getItem('admin_login_attempts');
    return saved ? JSON.parse(saved) : { count: 0, lockoutUntil: null };
  });

  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const metaRobots = document.createElement('meta');
    metaRobots.name = 'robots';
    metaRobots.content = 'noindex, nofollow';
    document.head.appendChild(metaRobots);

    return () => {
      document.head.removeChild(metaRobots);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (loginAttempts.lockoutUntil) {
      const checkLockout = () => {
        const remaining = loginAttempts.lockoutUntil - Date.now();
        if (remaining <= 0) {
          setLoginAttempts({ count: 0, lockoutUntil: null });
          localStorage.setItem('admin_login_attempts', JSON.stringify({ count: 0, lockoutUntil: null }));
          setLockoutRemaining(0);
        } else {
          setLockoutRemaining(Math.ceil(remaining / 1000));
        }
      };

      checkLockout();
      const interval = setInterval(checkLockout, 1000);
      return () => clearInterval(interval);
    }
  }, [loginAttempts.lockoutUntil]);

  const isLockedOut = loginAttempts.lockoutUntil && loginAttempts.lockoutUntil > Date.now();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLockedOut) return;

    setError('');
    setLoading(true);

    const success = await login(email, password);

    if (success) {
      localStorage.setItem('admin_login_attempts', JSON.stringify({ count: 0, lockoutUntil: null }));
      navigate('/admin');
    } else {
      const newAttempts = loginAttempts.count + 1;
      const newState = {
        count: newAttempts,
        lockoutUntil: newAttempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : null,
      };
      setLoginAttempts(newState);
      localStorage.setItem('admin_login_attempts', JSON.stringify(newState));

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        setError(`Too many failed attempts. Please try again in 5 minutes.`);
      } else {
        setError(`${t.admin.invalidCredentials} (${MAX_LOGIN_ATTEMPTS - newAttempts} attempts remaining)`);
      }
    }

    setLoading(false);
  };

  const currentLang = languages.find((l) => l.code === language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <motion.button
        onClick={() => navigate('/')}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05, x: 5 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">{t.admin.backToWebsite}</span>
      </motion.button>

      <div className="absolute top-4 right-4" ref={langMenuRef}>
        <button
          onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
          className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 transition-colors"
        >
          <Globe className="w-5 h-5" />
          <span className="text-sm font-medium">{currentLang?.code.toUpperCase()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isLangMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full right-0 mt-2 w-40 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden"
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                    language === lang.code ? 'bg-gray-700 text-orange-500' : 'text-gray-300'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(239, 68, 68, 0)',
                '0 0 0 8px rgba(239, 68, 68, 0.1)',
                '0 0 0 0 rgba(239, 68, 68, 0)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              </motion.div>
              <p className="text-red-400 font-medium text-sm sm:text-base">
                {t.admin.staffOnlyWarning}
              </p>
            </div>
          </motion.div>
        </motion.div>

        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center shadow-xl border border-gray-600"
          >
            <ShieldAlert className="w-10 h-10 text-orange-500" />
          </motion.div>
          <h1 className="text-3xl font-bold text-orange-500 tracking-wide mt-6">
            ORZUTECH
          </h1>
          <p className="text-gray-400 mt-2">{t.admin.login}</p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {isLockedOut && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3 text-yellow-400"
            >
              <Clock className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">
                Account locked. Try again in {Math.floor(lockoutRemaining / 60)}:{String(lockoutRemaining % 60).padStart(2, '0')}
              </span>
            </motion.div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t.admin.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLockedOut}
                  className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="admin@orzutech.uz"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t.admin.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLockedOut}
                  className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: isLockedOut ? 1 : 1.02 }}
              whileTap={{ scale: isLockedOut ? 1 : 0.98 }}
              type="submit"
              disabled={loading || isLockedOut}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-orange-500/30 transition-all disabled:shadow-none disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : t.admin.signIn}
            </motion.button>
          </div>
        </motion.form>

      </motion.div>
    </div>
  );
}
