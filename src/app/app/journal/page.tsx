'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Star, Trash2, ChevronLeft,
  FolderPlus, Folder as FolderIcon, MoreHorizontal, Sparkles,
  Plus, PenTool,
} from 'lucide-react';

import Link from 'next/link';
import {
  getEntries, getFolders, createFolder, renameFolder, deleteFolder,
  moveEntry, moveEntryToTrash, permanentlyDeleteEntry, setEntryStarred,
  RECENTLY_DELETED_FOLDER_ID,
  type JournalEntry, type Folder,
} from '@/lib/journal';
import { deleteJournalImage } from '@/lib/journalMedia';
import { JournalEntryRow, type RowOpenState } from '@/components/app/JournalEntryRow';
import { MoveEntrySheet } from '@/components/app/MoveEntrySheet';
import { ConfirmDialog } from '@/components/app/ConfirmDialog';

type ListView =
  | { kind: 'folder'; id: string | null }
  | { kind: 'starred' }
  | { kind: 'trash' };

export default function JournalPage() {
  const [folders, setFolders] = useState<Folder[]>(() =>
    typeof window !== 'undefined' ? getFolders() : []
  );
  const [entries, setEntries] = useState<JournalEntry[]>(() =>
    typeof window !== 'undefined' ? getEntries() : []
  );

  const [view, setView]                         = useState<ListView>({ kind: 'folder', id: null });
  // Mobile only: false = showing the folder/section picker, true = drilled into
  // that section's entries (mirrors Notes app's separate folder-list vs.
  // notes-list screens). Desktop always shows both side by side, ignoring this.
  const [mobileDrilledIn, setMobileDrilledIn]   = useState(false);
  const [creatingFolder, setCreatingFolder]     = useState(false);
  const [newFolderName, setNewFolderName]       = useState('');
  const [renamingId, setRenamingId]             = useState<string | null>(null);
  const [renameName, setRenameName]             = useState('');
  const [folderMenuId, setFolderMenuId]         = useState<string | null>(null);

  const selectView = (v: ListView) => {
    setView(v);
    setMobileDrilledIn(true);
    setFolderMenuId(null);
  };

  const [openRow, setOpenRow]         = useState<{ id: string; side: RowOpenState } | null>(null);
  const [moveEntryId, setMoveEntryId] = useState<string | null>(null);

  // Confirmation dialogs — window.confirm() is unreliable inside embedded
  // webviews like MiniPay's in-app browser, so destructive actions use a
  // real modal instead.
  const [deleteFolderConfirmId, setDeleteFolderConfirmId]           = useState<string | null>(null);
  const [permanentDeleteConfirmEntry, setPermanentDeleteConfirmEntry] = useState<JournalEntry | null>(null);

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

  const nonTrashedEntries = entries.filter(e => e.folderId !== RECENTLY_DELETED_FOLDER_ID);
  const starredCount = nonTrashedEntries.filter(e => e.starred).length;
  const trashCount = entries.length - nonTrashedEntries.length;

  const filteredEntries =
    view.kind === 'trash' ? entries.filter(e => e.folderId === RECENTLY_DELETED_FOLDER_ID) :
    view.kind === 'starred' ? nonTrashedEntries.filter(e => e.starred) :
    view.id === null ? nonTrashedEntries :
    nonTrashedEntries.filter(e => e.folderId === view.id);

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
    setDeleteFolderConfirmId(id);
  };

  const confirmDeleteFolder = () => {
    if (!deleteFolderConfirmId) return;
    deleteFolder(deleteFolderConfirmId);
    if (view.kind === 'folder' && view.id === deleteFolderConfirmId) setView({ kind: 'folder', id: null });
    setDeleteFolderConfirmId(null);
    refresh();
  };

  const restoreDraft = () => {
    setHasDraft(false);
  };

  const discardDraft = () => {
    localStorage.removeItem('mm_journal_draft');
    setHasDraft(false);
  };

  // -- Entry action handlers --------------------------------------------------

  const handleMoveSelect = (folderId: string | undefined) => {
    if (!moveEntryId) return;
    moveEntry(moveEntryId, folderId);
    setMoveEntryId(null);
  };

  const handleDeleteEntry = (entry: JournalEntry) => {
    if (view.kind === 'trash') {
      setPermanentDeleteConfirmEntry(entry);
    } else {
      moveEntryToTrash(entry.id);
    }
  };

  const confirmPermanentDeleteEntry = () => {
    if (!permanentDeleteConfirmEntry) return;
    if (permanentDeleteConfirmEntry.image) deleteJournalImage(permanentDeleteConfirmEntry.image).catch(() => {});
    permanentlyDeleteEntry(permanentDeleteConfirmEntry.id);
    setPermanentDeleteConfirmEntry(null);
  };

  const handleToggleStar = (entry: JournalEntry) => {
    setEntryStarred(entry.id, !entry.starred);
  };

  // -- Sidebar folder item ---------------------------------------------------

  const renderSidebarFolder = (folder: Folder) => {
    const isActive   = view.kind === 'folder' && view.id === folder.id;
    const isRenaming = renamingId === folder.id;
    const showMenu   = folderMenuId === folder.id;
    const count      = nonTrashedEntries.filter(e => e.folderId === folder.id).length;

    return (
      <div key={folder.id} className="relative">
        <div
          className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all ${
            isActive
              ? 'bg-accent/15 text-accent'
              : 'text-text-muted hover:bg-surface-2 hover:text-text-primary'
          }`}
          onClick={() => { if (!isRenaming) selectView({ kind: 'folder', id: folder.id }); }}
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

  // -- Active view header label ---------------------------------------------

  const activeViewName =
    view.kind === 'starred' ? 'Starred' :
    view.kind === 'trash' ? 'Recently Deleted' :
    view.id ? (folders.find(f => f.id === view.id)?.name ?? 'Folder') : 'All Notes';

  const newEntryHref = view.kind === 'folder' && view.id
    ? `/app/journal/new?folder=${view.id}`
    : '/app/journal/new';

  const emptyTitle =
    view.kind === 'trash' ? 'Recently Deleted is empty' :
    view.kind === 'starred' ? 'No starred entries yet' :
    view.kind === 'folder' && view.id ? 'This folder is empty' : 'No entries yet';

  const emptySubtitle =
    view.kind === 'trash' ? 'Deleted entries appear here before being permanently removed.' :
    view.kind === 'starred' ? 'Swipe an entry right (or use the star icon on desktop) to pin it here.' :
    view.kind === 'folder' && view.id ? 'Write a new entry and assign it to this folder.' : 'Tap New Entry to capture your first thought.';

  const showWriteFirstEntry = view.kind === 'folder';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-24"
      onClick={() => { if (folderMenuId) setFolderMenuId(null); if (openRow) setOpenRow(null); }}
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

      {/* -- Two-panel layout: on mobile these are separate screens (folder ----- */}
      {/* -- picker vs. that section's entries, like Notes app); desktop shows -- */}
      {/* -- both side by side always. ------------------------------------------ */}
      <div className="lg:flex lg:gap-7">

        {/* Folder list — its own screen on mobile until a section is picked, fixed-width sidebar on desktop */}
        <aside className={`flex-col w-full lg:w-48 shrink-0 mb-6 lg:mb-0 ${mobileDrilledIn ? 'hidden lg:flex' : 'flex'}`}>
          <div className="divide-y divide-border/40 rounded-xl overflow-hidden border border-border/40">
            {starredCount > 0 && (
              <div
                className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all ${
                  view.kind === 'starred'
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text-primary'
                }`}
                onClick={() => selectView({ kind: 'starred' })}
              >
                <Star className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-sm">Starred</span>
                <span className="text-xs font-mono opacity-50">{starredCount}</span>
              </div>
            )}

            <div
              className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all ${
                view.kind === 'folder' && view.id === null
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:bg-surface-2 hover:text-text-primary'
              }`}
              onClick={() => selectView({ kind: 'folder', id: null })}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-sm">All Notes</span>
              <span className="text-xs font-mono opacity-50">{nonTrashedEntries.length}</span>
            </div>
            {folders.map(f => renderSidebarFolder(f))}

            {trashCount > 0 && (
              <div
                className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all ${
                  view.kind === 'trash'
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text-primary'
                }`}
                onClick={() => selectView({ kind: 'trash' })}
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-sm">Recently Deleted</span>
                <span className="text-xs font-mono opacity-50">{trashCount}</span>
              </div>
            )}
          </div>

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

        {/* -- Entries main panel — its own screen on mobile once drilled in -- */}
        <div className={`flex-1 min-w-0 space-y-3 ${mobileDrilledIn ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>

          {/* Active view label + reflect link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMobileDrilledIn(false)}
                className="lg:hidden p-1 -ml-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
                aria-label="Back to folders"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <span className="text-lg font-serif text-text-primary">{activeViewName}</span>
                <span className="text-xs text-text-muted/60 font-mono ml-2">
                  {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
            </div>
            {view.kind === 'folder' && view.id && (
              <Link
                href={`/app/reflect?folder=${view.id}`}
                className="flex items-center gap-1.5 text-xs font-mono text-accent/80 hover:text-accent transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Reflect on folder
              </Link>
            )}
          </div>

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
              {filteredEntries.map(entry => (
                <JournalEntryRow
                  key={entry.id}
                  entry={entry}
                  folderName={entry.folderId ? folders.find(f => f.id === entry.folderId)?.name : null}
                  showFolderTag={view.kind === 'folder' && view.id === null}
                  isTrashView={view.kind === 'trash'}
                  open={openRow?.id === entry.id ? openRow.side : 'none'}
                  onOpenChange={side => setOpenRow(side === 'none' ? null : { id: entry.id, side })}
                  onMove={() => setMoveEntryId(entry.id)}
                  onDelete={() => handleDeleteEntry(entry)}
                  onToggleStar={() => handleToggleStar(entry)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <BookOpen className="w-12 h-12 text-text-muted/20 mb-4" />
              <p className="font-serif text-text-primary/60 text-lg mb-1">{emptyTitle}</p>
              <p className="text-xs font-mono text-text-muted/70 max-w-[240px]">{emptySubtitle}</p>
              {showWriteFirstEntry && (
                <Link
                  href={newEntryHref}
                  className="mt-6 flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-xl text-xs font-mono hover:bg-accent/15 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Write first entry
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <MoveEntrySheet
        isOpen={moveEntryId !== null}
        onClose={() => setMoveEntryId(null)}
        folders={folders}
        currentFolderId={moveEntryId ? entries.find(e => e.id === moveEntryId)?.folderId : undefined}
        onSelect={handleMoveSelect}
        onFolderCreated={refresh}
      />

      <ConfirmDialog
        isOpen={deleteFolderConfirmId !== null}
        title="Delete this folder?"
        message="Entries will stay in All Notes."
        confirmLabel="Delete Folder"
        danger
        onConfirm={confirmDeleteFolder}
        onCancel={() => setDeleteFolderConfirmId(null)}
      />

      <ConfirmDialog
        isOpen={permanentDeleteConfirmEntry !== null}
        title="Permanently delete this entry?"
        message="This action cannot be undone."
        confirmLabel="Delete Forever"
        danger
        onConfirm={confirmPermanentDeleteEntry}
        onCancel={() => setPermanentDeleteConfirmEntry(null)}
      />
    </motion.div>
  );
}
