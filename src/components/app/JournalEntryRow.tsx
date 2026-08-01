'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, animate as fmAnimate, type PanInfo } from 'framer-motion';
import { ChevronRight, Smile, Star, FolderOpen, Trash2 } from 'lucide-react';
import { MOOD_ICONS, stripMarkdownForPreview, type JournalEntry } from '@/lib/journal';

const MOOD_TEXT: Record<string, string> = {
  happy: 'text-accent',
  excited: 'text-accent-gold',
  neutral: 'text-text-muted',
  sad: 'text-blue-400',
  angry: 'text-red-400',
};

const ACTIONS_WIDTH = 144; // Move + Delete, revealed on swipe-left
const STAR_WIDTH = 72;     // Star, revealed on swipe-right

export type RowOpenState = 'none' | 'actions' | 'star';

interface JournalEntryRowProps {
  entry: JournalEntry;
  folderName?: string | null;
  showFolderTag: boolean;
  isTrashView: boolean;
  open: RowOpenState;
  onOpenChange: (open: RowOpenState) => void;
  onMove: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}

export function JournalEntryRow({
  entry, folderName, showFolderTag, isTrashView, open, onOpenChange, onMove, onDelete, onToggleStar,
}: JournalEntryRowProps) {
  const router = useRouter();
  const MoodIcon = MOOD_ICONS[entry.mood] || Smile;
  const lines = entry.content.split('\n');
  const title = stripMarkdownForPreview(lines[0]?.trim() || '');
  const preview = stripMarkdownForPreview(lines.slice(1).join(' ').trim());

  const x = useMotionValue(0);
  const draggedRef = useRef(false);

  useEffect(() => {
    const target = open === 'actions' ? -ACTIONS_WIDTH : open === 'star' ? STAR_WIDTH : 0;
    const controls = fmAnimate(x, target, { type: 'spring', bounce: 0.15, duration: 0.3 });
    return () => controls.stop();
  }, [open, x]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const current = x.get();
    if (current < -ACTIONS_WIDTH / 2) onOpenChange('actions');
    else if (current > STAR_WIDTH / 2) onOpenChange('star');
    else onOpenChange('none');
  };

  const handleClick = () => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    if (open !== 'none') { onOpenChange('none'); return; }
    router.push(`/app/journal/${entry.id}`);
  };

  return (
    <div className="relative overflow-hidden group bg-bg" style={{ contentVisibility: 'auto', containIntrinsicSize: '88px' }}>
      {/* Right-side actions, revealed by swiping left */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS_WIDTH }}>
        <button
          onClick={() => { onMove(); onOpenChange('none'); }}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="text-[9px] font-mono">Move</span>
        </button>
        <button
          onClick={() => { onDelete(); onOpenChange('none'); }}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-900/40 text-red-300 hover:bg-red-900/60 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-[9px] font-mono">{isTrashView ? 'Delete forever' : 'Delete'}</span>
        </button>
      </div>

      {/* Left-side star action, revealed by swiping right */}
      {!isTrashView && (
        <div className="absolute inset-y-0 left-0 flex" style={{ width: STAR_WIDTH }}>
          <button
            onClick={() => { onToggleStar(); onOpenChange('none'); }}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 transition-colors"
          >
            <Star className={`w-4 h-4 ${entry.starred ? 'fill-accent-gold' : ''}`} />
          </button>
        </div>
      )}

      {/* Draggable row content */}
      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: -ACTIONS_WIDTH, right: isTrashView ? 0 : STAR_WIDTH }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragStart={() => { draggedRef.current = false; }}
        onDrag={(_, info) => { if (Math.abs(info.offset.x) > 5) draggedRef.current = true; }}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        className="relative bg-bg flex items-start gap-3 p-4 cursor-pointer select-none"
      >
        <MoodIcon className={`w-4 h-4 ${MOOD_TEXT[entry.mood] || 'text-text-muted'} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate leading-snug flex items-center gap-1.5">
            {entry.starred && <Star className="w-3 h-3 fill-accent-gold text-accent-gold shrink-0" />}
            {title || <span className="text-text-muted/50 italic font-normal text-xs">Untitled</span>}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-text-muted/60 font-mono">{entry.date}</span>
            {showFolderTag && folderName && (
              <span className="text-[11px] text-accent/60 font-mono">{folderName}</span>
            )}
          </div>
          {preview && (
            <p className="text-xs text-text-muted/50 mt-1 line-clamp-1 font-mono">{preview}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted/30 shrink-0 mt-0.5" />

        {/* Desktop-only hover actions — no swipe gesture on a mouse, so this is the primary affordance there */}
        <div className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity gap-1 bg-bg pl-2">
          <button
            onClick={e => { e.stopPropagation(); onMove(); }}
            title="Move"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          {!isTrashView && (
            <button
              onClick={e => { e.stopPropagation(); onToggleStar(); }}
              title={entry.starred ? 'Unstar' : 'Star'}
              className="p-1.5 rounded-lg text-text-muted hover:text-accent-gold hover:bg-surface-2 transition-colors"
            >
              <Star className={`w-4 h-4 ${entry.starred ? 'fill-accent-gold text-accent-gold' : ''}`} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title={isTrashView ? 'Delete forever' : 'Delete'}
            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
