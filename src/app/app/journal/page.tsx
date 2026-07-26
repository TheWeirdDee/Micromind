'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Smile, ChevronRight,
  FolderPlus, Folder as FolderIcon, MoreHorizontal, Sparkles,
  Plus, PenTool,
} from 'lucide-react';

import Link from 'next/link';
import {
  getEntries, getFolders, createFolder, renameFolder, deleteFolder,
  stripMarkdownForPreview, MOOD_ICONS,
  type JournalEntry, type Folder,
} from '@/lib/journal';

const MOOD_TEXT: Record<string, string> = {
  happy: 'text-accent',
  excited: 'text-accent-gold',
  neutral: 'text-text-muted',
  sad: 'text-blue-400',
  angry: 'text-red-400',
};

export default function JournalPage() {
  // Data
  const [folders, setFolders] = useState<Folder[]>(() =>
    typeof window !== 'undefined' ? getFolders() : []
  );
  const [entries, setEntries] = useState<JournalEntry[]>(() =>
    typeof window !== 'undefined' ? getEntries() : []
  );

  // Folder UI
  const [activeFolderId, setActiveFolderId]     = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder]     = useState(false);
  const [newFolderName, setNewFolderName]       = useState('');
  const [renamingId, setRenamingId]             = useState<string | null>(null);
  const [renameName, setRenameName]             = useState('');
  const [folderMenuId, setFolderMenuId]         = useState<string | null>(null);

  const [hasDraft, setHasDraft] = useState<boolean>(() =>
    typeof window !== 'undefined' && !!localStorage.getItem('mm_journal_draft')
  );

  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setFolders(getFolders());
    setEntries(getEntries());
  };

  useEffect(() => {
    window.addEventListener('journal_updated', refresh);
    return () => window.removeEventListener('journal_updated', refresh);
  }, []);

  useEffect(() => {
    if (creatingFolder) newFolderInputRef.current?.focus();
  }, [creatingFolder]);

  // Refresh in case an entry was saved/edited/deleted on the full-screen editor page
  useEffect(() => {
    const handleFocus = () => refresh();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const filteredEntries = activeFolderId === null
    ? entries
    : entries.filter(e => e.folderId === activeFolderId);

  // -- Folder handlers -------------------------------------------------------

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) { setCreatingFolder(false); return; }
    createFolder(newFolderName.trim());
    setNewFolderName('');
    setCreatingFolder(false);
    refresh();
  };

  const handleRenameFolder = (id: string) => {
    if (renameName.trim()) renameFolder(id, renameName.trim());
    setRenamingId(null);
    refresh();
  };

  const handleDeleteFolder = (id: string) => {
    if (!window.confirm('Delete this folder? Entries will stay in All Notes.')) return;
    deleteFolder(id);
    if (activeFolderId === id) setActiveFolderId(null);
    refresh();
  };

  const restoreDraft = () => {
    setHasDraft(false);
  };

  const discardDraft = () => {
    localStorage.removeItem('mm_journal_draft');
    setHasDraft(false);
  };

  // -- Sidebar folder item ---------------------------------------------------

  const renderSidebarFolder = (folder: Folder) => {
    const isActive   = activeFolderId === folder.id;
    const isRenaming = renamingId === folder.id;
    const showMenu   = folderMenuId === folder.id;
    const count      = entries.filter(e => e.folderId === folder.id).length;

    return (
      <div key={folder.id} className="relative">
        <div
          className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all ${
            isActive
              ? 'bg-accent/15 text-accent'
              : 'text-text-muted hover:bg-surface-2 hover:text-text-primary'
          }`}
          onClick={() => { if (!isRenaming) { setActiveFolderId(folder.id); setFolderMenuId(null); } }}
        >
          <FolderIcon className="w-4 h-4 shrink-0" />
          {isRenaming ? (
            <input
              autoFocus
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              onBlur={() => handleRenameFolder(folder.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameFolder(folder.id);
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onClick={e => e.stopPropagation()}
              className="flex-1 bg-transparent text-sm text-text-primary outline-none border-b border-accent"
            />
          ) : (
            <span className="flex-1 text-sm truncate">{folder.name}</span>
          )}
          <span className="text-xs font-mono opacity-50">{count}</span>
          {!isRenaming && (
            <button
              onClick={e => { e.stopPropagation(); setFolderMenuId(showMenu ? null : folder.id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-2/80 transition-opacity"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden text-xs font-mono w-32">
            <button
              onClick={() => { setRenamingId(folder.id); setRenameName(folder.name); setFolderMenuId(null); }}
              className="w-full px-4 py-2.5 text-left hover:bg-surface-2 text-text-primary transition-colors"
            >
              Rename
            </button>
            <button
              onClick={() => { setFolderMenuId(null); handleDeleteFolder(folder.id); }}
              className="w-full px-4 py-2.5 text-left hover:bg-red-900/20 text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  // -- Active folder header label ---------------------------------------------

  const activeFolderName = activeFolderId
    ? (folders.find(f => f.id === activeFolderId)?.name ?? 'Folder')
    : 'All Notes';

  const newEntryHref = activeFolderId
    ? `/app/journal/new?folder=${activeFolderId}`
    : '/app/journal/new';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-24"
      onClick={() => { if (folderMenuId) setFolderMenuId(null); }}
    >
      {/* -- Page header --------------------------------------------------- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Journal</p>
          <h1 className="text-3xl font-serif mt-1">Your entries</h1>
        </div>
        <Link
          href={newEntryHref}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-bg rounded-2xl text-xs font-mono font-bold shadow-lg shadow-accent/20 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </Link>
      </div>

      {/* -- Two-panel layout: folder list stacks above entries on mobile, ------ */}
      {/* -- sits beside them on desktop — same vertical list either way ------- */}
      <div className="lg:flex lg:gap-7">

        {/* Folder list — full width above entries on mobile, fixed-width sidebar on desktop */}
        <aside className="flex flex-col w-full lg:w-48 shrink-0 mb-6 lg:mb-0">
          <div className="divide-y divide-border/40 rounded-xl overflow-hidden border border-border/40">
            {/* All Notes */}
            <div
              className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all ${
                activeFolderId === null
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:bg-surface-2 hover:text-text-primary'
              }`}
              onClick={() => setActiveFolderId(null)}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-sm">All Notes</span>
              <span className="text-xs font-mono opacity-50">{entries.length}</span>
            </div>
            {folders.map(f => renderSidebarFolder(f))}
          </div>

          {/* New folder */}
          <div className="mt-4 pt-4 border-t border-border">
            <AnimatePresence mode="wait">
              {creatingFolder ? (
                <motion.div
                  key="creating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <input
                    ref={newFolderInputRef}
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                    }}
                    placeholder="Folder name..."
                    className="w-full bg-surface-2 border border-accent rounded-xl px-3 py-2 text-xs font-mono text-text-primary outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreateFolder} className="flex-1 py-1.5 bg-accent text-bg rounded-lg text-xs font-mono font-bold">Create</button>
                    <button
                      onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}
                      className="flex-1 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setCreatingFolder(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-text-muted hover:text-accent rounded-xl hover:bg-accent/5 transition-all text-sm group"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>New Folder</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* -- Entries main panel ------------------------------------------- */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Active folder label + reflect link */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-serif text-text-primary">{activeFolderName}</span>
              <span className="text-xs text-text-muted/60 font-mono ml-2">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            {activeFolderId && (
              <Link
                href={`/app/reflect?folder=${activeFolderId}`}
                className="flex items-center gap-1.5 text-xs font-mono text-accent/80 hover:text-accent transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Reflect on folder
              </Link>
            )}
          </div>

          {/* Draft banner */}
          {hasDraft && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between bg-accent-gold/10 border border-accent-gold/30 rounded-2xl p-4 gap-3"
            >
              <div className="flex items-center gap-3">
                <PenTool className="w-4 h-4 text-accent-gold" />
                <p className="text-sm font-mono text-text-primary">You have an unsaved draft.</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/app/journal/new"
                  onClick={restoreDraft}
                  className="px-4 py-2 bg-accent-gold/20 hover:bg-accent-gold/30 text-accent-gold rounded-xl text-xs font-mono transition-colors"
                >
                  Restore
                </Link>
                <button
                  onClick={discardDraft}
                  className="px-4 py-2 hover:bg-surface-2 text-text-muted rounded-xl text-xs font-mono transition-colors"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}

          {/* Entry list — flat, Notes-app style, hairline dividers between rows */}
          {filteredEntries.length > 0 ? (
            <div className="divide-y divide-border/40 rounded-xl border border-border/40 overflow-hidden">
              {filteredEntries.map(entry => {
                const MoodIcon = MOOD_ICONS[entry.mood] || Smile;
                const lines    = entry.content.split('\n');
                const title    = stripMarkdownForPreview(lines[0]?.trim() || '');
                const preview  = stripMarkdownForPreview(lines.slice(1).join(' ').trim());
                const fName    = entry.folderId
                  ? folders.find(f => f.id === entry.folderId)?.name
                  : null;

                return (
                  <Link
                    key={entry.id}
                    href={`/app/journal/${entry.id}`}
                    className="flex items-start gap-3 p-4 hover:bg-surface-2/60 transition-colors"
                  >
                    <MoodIcon className={`w-4 h-4 ${MOOD_TEXT[entry.mood] || 'text-text-muted'} mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate leading-snug">
                        {title || <span className="text-text-muted/50 italic font-normal text-xs">Untitled</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-text-muted/60 font-mono">{entry.date}</span>
                        {activeFolderId === null && fName && (
                          <span className="text-[11px] text-accent/60 font-mono">{fName}</span>
                        )}
                      </div>
                      {preview && (
                        <p className="text-xs text-text-muted/50 mt-1 line-clamp-1 font-mono">{preview}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted/30 shrink-0 mt-0.5" />
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <BookOpen className="w-12 h-12 text-text-muted/20 mb-4" />
              <p className="font-serif text-text-primary/60 text-lg mb-1">
                {activeFolderId ? 'This folder is empty' : 'No entries yet'}
              </p>
              <p className="text-xs font-mono text-text-muted/70 max-w-[240px]">
                {activeFolderId
                  ? 'Write a new entry and assign it to this folder.'
                  : 'Tap New Entry to capture your first thought.'}
              </p>
              <Link
                href={newEntryHref}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-xl text-xs font-mono hover:bg-accent/15 transition-colors"
              >
                <Plus className="w-4 h-4" /> Write first entry
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
