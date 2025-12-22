import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  icon: ReactNode;
  isSubmitting?: boolean;
  isFormValid?: boolean;
  isEditing?: boolean;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function AdminModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  icon,
  isSubmitting = false,
  isFormValid = true,
  isEditing = false,
  children,
  size = 'md'
}: AdminModalProps) {
  const { t, language } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSubmitting) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, isSubmitting, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 flex flex-col w-full ${sizeClasses[size]}`}
              style={{
                maxHeight: '90vh',
                margin: 'auto',
              }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-900 rounded-t-2xl flex-shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    {icon}
                  </div>
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {children}
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl flex-shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                  >
                    {t.admin.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {language === 'uz' ? 'Saqlanmoqda...' : language === 'ru' ? 'Сохранение...' : 'Saving...'}
                      </>
                    ) : isEditing ? (
                      language === 'uz' ? 'Saqlash' : language === 'ru' ? 'Сохранить' : 'Save'
                    ) : (
                      language === 'uz' ? 'Yaratish' : language === 'ru' ? 'Создать' : 'Create'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
