'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Replaces window.confirm() for destructive/important actions. Native confirm()
 * is unreliable inside embedded webviews (e.g. MiniPay's in-app browser silently
 * no-ops it), which made every window.confirm() call in this app look like a
 * dead button there.
 */
export function ConfirmDialog({
  isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dialog = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="relative w-full max-w-[360px] bg-surface border border-border rounded-[1.75rem] shadow-2xl p-6"
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-2 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${danger ? 'bg-red-900/30 text-red-400' : 'bg-accent/10 text-accent'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-serif text-text-primary mb-2">{title}</h3>
            <p className="text-xs font-mono text-text-muted leading-relaxed mb-6">{message}</p>

            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 border border-border rounded-xl text-xs font-mono text-text-muted hover:bg-surface-2 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                  danger ? 'bg-red-500/90 hover:bg-red-500 text-white' : 'bg-accent text-bg hover:opacity-90'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(dialog, document.body);
}
