'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Folder as FolderIcon, BookOpen } from 'lucide-react';
import type { Folder } from '@/lib/journal';

interface MoveEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | undefined;
  onSelect: (folderId: string | undefined) => void;
}

export function MoveEntrySheet({ isOpen, onClose, folders, currentFolderId, onSelect }: MoveEntrySheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sheet = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full sm:max-w-[380px] bg-surface border border-border rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <span className="text-sm font-serif text-text-primary">Move to...</span>
              <button
                onClick={onClose}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-2 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2">
              <button
                onClick={() => { onSelect(undefined); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-surface-2 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-text-muted shrink-0" />
                <span className="flex-1 text-sm text-text-primary">No folder</span>
                {currentFolderId === undefined && <Check className="w-4 h-4 text-accent shrink-0" />}
              </button>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => { onSelect(f.id); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-surface-2 transition-colors"
                >
                  <FolderIcon className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="flex-1 text-sm text-text-primary truncate">{f.name}</span>
                  {currentFolderId === f.id && <Check className="w-4 h-4 text-accent shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(sheet, document.body);
}
