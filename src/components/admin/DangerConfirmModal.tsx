import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface DangerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  requireTypedConfirmation?: boolean;
  confirmationWord?: string;
  itemCount?: number;
  processingText?: string;
  typeToConfirmText?: string;
  itemsWillBeDeletedText?: string;
}

export default function DangerConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  requireTypedConfirmation = false,
  confirmationWord = 'DELETE',
  itemCount,
  processingText = 'Processing...',
  typeToConfirmText = 'Type {word} to confirm:',
  itemsWillBeDeletedText = '{count} item(s) will be permanently deleted',
}: DangerConfirmModalProps) {
  const [typedValue, setTypedValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canConfirm = !requireTypedConfirmation || typedValue === confirmationWord;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsLoading(true);
    try {
      await onConfirm();
      setTypedValue('');
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setTypedValue('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button
                      onClick={handleClose}
                      disabled={isLoading}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="mt-2 text-gray-400 text-sm">{description}</p>
                </div>
              </div>

              {itemCount !== undefined && itemCount > 0 && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm font-medium">
                    {itemsWillBeDeletedText.replace('{count}', String(itemCount))}
                  </p>
                </div>
              )}

              {requireTypedConfirmation && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">
                    {typeToConfirmText.split('{word}')[0]}
                    <span className="font-mono font-bold text-red-400">{confirmationWord}</span>
                    {typeToConfirmText.split('{word}')[1] || ''}
                  </p>
                  <input
                    type="text"
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    placeholder={confirmationWord}
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-red-500 disabled:opacity-50"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm || isLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {processingText}
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
