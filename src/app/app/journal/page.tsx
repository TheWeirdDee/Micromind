'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, PenTool, Trash2, Pencil, Check, X, Plus,
  Smile, Laugh, Meh, Angry, Frown, ChevronRight,
  FolderPlus, Folder as FolderIcon, MoreHorizontal, Sparkles,
  Copy, Command, CornerDownLeft, Mail,
} from 'lucide-react';

import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import {
  getEntries, saveEntry, editEntry, deleteEntry,
  getFolders, createFolder, renameFolder, deleteFolder,
  updateStreak, MOOD_ICONS,
  type JournalEntry, type Folder,
} from '@/lib/journal';

const MOODS = [
  { mood: 'happy',   icon: Smile,  label: 'Happy'   },
  { mood: 'excited', icon: Laugh,  label: 'Excited' },
  { mood: 'neutral', icon: Meh,    label: 'Neutral' },
  { mood: 'angry',   icon: Angry,  label: 'Angry'   },
  { mood: 'sad',     icon: Frown,  label: 'Sad'     },
];

const MOOD_STYLES: Record<string, { border: string; bg: string; text: string; bgExpanded: string }> = {
  happy: {
    border: 'hover:border-accent/45 border-accent/15',
    bg: 'bg-accent/2',
    text: 'text-accent',
    bgExpanded: 'bg-accent/5 border-accent/25'
  },
  excited: {
    border: 'hover:border-accent-gold/45 border-accent-gold/15',
    bg: 'bg-accent-gold/2',
    text: 'text-accent-gold',
    bgExpanded: 'bg-accent-gold/5 border-accent-gold/25'
  },
  neutral: {
    border: 'hover:border-text-muted/30 border-border',
    bg: 'bg-surface-2/30',
    text: 'text-text-muted',
    bgExpanded: 'bg-surface border-border'
  },
  sad: {
    border: 'hover:border-blue-400/45 border-blue-400/15',
    bg: 'bg-blue-400/2',
    text: 'text-blue-400',
    bgExpanded: 'bg-blue-400/5 border-blue-400/25'
  },
  angry: {
    border: 'hover:border-red-400/45 border-red-400/15',
    bg: 'bg-red-400/2',
    text: 'text-red-400',
    bgExpanded: 'bg-red-400/5 border-red-400/25'
  }
};

function MoodRow({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div className="flex gap-2">
      {MOODS.map(m => (
        <motion.button
          key={m.mood}
          type="button"
          whileHover={{ scale: 1.15, rotate: value === m.mood ? 0 : [0, -5, 5, 0] }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(m.mood)}
          title={m.label}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all ${
            value === m.mood
              ? 'bg-accent/15 border-accent shadow-sm shadow-accent/10'
              : 'border-border hover:bg-surface-2 hover:border-text-muted/30'
          }`}
        >
          <m.icon className={`w-4 h-4 transition-colors ${value === m.mood ? 'text-accent' : 'text-text-muted'}`} />
        </motion.button>
      ))}
    </div>
  );
}

function FolderPills({
  folders,
  value,
  onChange,
}: { folders: Folder[]; value: string | undefined; onChange: (id: string | undefined) => void }) {
  if (folders.length === 0) return null;
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onChange(undefined)}
        className={`px-3 py-1 rounded-full text-xs font-mono border transition-all ${
          !value ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-muted hover:bg-surface-2'
        }`}
      >
        No folder
      </button>
      {folders.map(f => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`px-3 py-1 rounded-full text-xs font-mono border transition-all ${
            value === f.id ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-muted hover:bg-surface-2'
          }`}
        >
          {f.name}
        </button>
      ))}
    </div>
  );
}

export default function JournalPage() {
  const { address } = useWallet();

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

  // Entry UI
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood]       = useState('happy');
  const [editFolder, setEditFolder]   = useState<string | undefined>(undefined);

  // Compose
  const [showCompose, setShowCompose]       = useState(false);
  const [composeContent, setComposeContent] = useState('');
  const [composeMood, setComposeMood]       = useState('happy');
  const [composeFolder, setComposeFolder]   = useState<string | undefined>(undefined);
  const [hasDraft, setHasDraft] = useState<boolean>(() =>
    typeof window !== 'undefined' && !!localStorage.getItem('mm_journal_draft')
  );

  const [toast, setToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const composeRef        = useRef<HTMLTextAreaElement>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  useEffect(() => {
    if (showCompose) composeRef.current?.focus();
  }, [showCompose]);

  useEffect(() => {
    setTimeout(() => setComposeFolder(activeFolderId ?? undefined), 0);
  }, [activeFolderId]);

  useEffect(() => {
    if (showCompose) {
      if (composeContent.trim() !== '') {
        const draft = { content: composeContent, mood: composeMood, folderId: composeFolder };
        localStorage.setItem('mm_journal_draft', JSON.stringify(draft));
      } else {
        localStorage.removeItem('mm_journal_draft');
      }
    }
  }, [composeContent, composeMood, composeFolder, showCompose]);


  const filteredEntries = activeFolderId === null
    ? entries
    : entries.filter(e => e.folderId === activeFolderId);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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

  // -- Entry handlers --------------------------------------------------------

  const handleSave = () => {
    if (!composeContent.trim()) return;
    saveEntry({ content: composeContent.trim(), mood: composeMood, folderId: composeFolder });
    updateStreak(address);
    setComposeContent('');
    setComposeMood('happy');
    setShowCompose(false);
    localStorage.removeItem('mm_journal_draft');
    setHasDraft(false);
    showToast('Entry saved');
  };

  const restoreDraft = () => {
    try {
      const draftStr = localStorage.getItem('mm_journal_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        setComposeContent(draft.content || '');
        setComposeMood(draft.mood || 'happy');
        if (draft.folderId) setComposeFolder(draft.folderId);
        setShowCompose(true);
      }
    } catch {}
    setHasDraft(false);
  };

  const discardDraft = () => {
    localStorage.removeItem('mm_journal_draft');
    setHasDraft(false);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editContent.trim()) return;
    editEntry(editingId, { content: editContent.trim(), mood: editMood, folderId: editFolder });
    setEditingId(null);
    showToast('Entry updated');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    deleteEntry(id);
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
    setEditMood(entry.mood);
    setEditFolder(entry.folderId);
    setExpandedId(entry.id);
  };

  const toggleExpand = (id: string) => {
    if (editingId === id) return;
    if (editingId) setEditingId(null);
    setExpandedId(prev => (prev === id ? null : id));
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
          className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${
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
        <button
          onClick={() => setShowCompose(c => !c)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-bg rounded-2xl text-xs font-mono font-bold shadow-lg shadow-accent/20 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* -- Mobile folder tabs -------------------------------------------- */}
      <div className="lg:hidden mb-5">
        <div
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        >
          <button
            onClick={() => setActiveFolderId(null)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono whitespace-nowrap border shrink-0 transition-all ${
              activeFolderId === null
                ? 'bg-accent text-bg border-accent'
                : 'border-border text-text-muted hover:bg-surface-2'
            }`}
          >
            All Notes
            <span className="opacity-60 ml-0.5">{entries.length}</span>
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFolderId(f.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono whitespace-nowrap border shrink-0 transition-all ${
                activeFolderId === f.id
                  ? 'bg-accent text-bg border-accent'
                  : 'border-border text-text-muted hover:bg-surface-2'
              }`}
            >
              {f.name}
              <span className="opacity-60 ml-0.5">{entries.filter(e => e.folderId === f.id).length}</span>
            </button>
          ))}
          <button
            onClick={() => setCreatingFolder(true)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-mono whitespace-nowrap border border-dashed border-border text-text-muted hover:border-accent hover:text-accent shrink-0 transition-all"
          >
            <Plus className="w-3 h-3" /> Folder
          </button>
        </div>

        {/* Mobile new folder input */}
        <AnimatePresence>
          {creatingFolder && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="flex gap-2">
                <input
                  ref={newFolderInputRef}
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                  }}
                  placeholder="Folder name..."
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-accent font-mono"
                />
                <button onClick={handleCreateFolder} className="px-3 py-2 bg-accent text-bg rounded-xl text-xs font-mono font-bold">Create</button>
                <button
                  onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}
                  className="px-3 py-2 border border-border rounded-xl text-xs font-mono text-text-muted"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* -- Desktop two-panel layout --------------------------------------- */}
      <div className="lg:flex lg:gap-7">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-48 shrink-0">
          <div className="space-y-0.5">
            {/* All Notes */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${
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
          {hasDraft && !showCompose && (
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
                <button
                  onClick={restoreDraft}
                  className="px-4 py-2 bg-accent-gold/20 hover:bg-accent-gold/30 text-accent-gold rounded-xl text-xs font-mono transition-colors"
                >
                  Restore
                </button>
                <button
                  onClick={discardDraft}
                  className="px-4 py-2 hover:bg-surface-2 text-text-muted rounded-xl text-xs font-mono transition-colors"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}


          {/* Compose form */}
          <AnimatePresence>
            {showCompose && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-surface border border-accent/40 rounded-2xl p-4 space-y-4 shadow-lg shadow-accent/5 mb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-text-muted">New entry</span>
                    <button onClick={() => setShowCompose(false)} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <MoodRow value={composeMood} onChange={setComposeMood} />

                  <textarea
                    ref={composeRef}
                    value={composeContent}
                    onChange={e => setComposeContent(e.target.value)}
                    placeholder="What's on your mind today?"
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(); }}
                    className="w-full min-h-[120px] resize-none bg-surface-2 rounded-xl border border-border p-3 font-mono text-sm leading-relaxed text-text-primary outline-none focus:border-accent transition-colors"
                  />

                  <div className="flex justify-between items-center text-[10px] font-mono text-text-muted/60 px-1 -mt-2">
                    <span>{composeContent.length} chars</span>
                    <span>
                      {composeContent.trim() === '' ? 0 : composeContent.trim().split(/\s+/).length} words
                      {composeContent.trim() !== '' && ` · ~${Math.max(1, Math.round(composeContent.trim().split(/\s+/).length / 200))} min read`}
                    </span>
                  </div>

                  <FolderPills folders={folders} value={composeFolder} onChange={v => setComposeFolder(v)} />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={!composeContent.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-bg rounded-xl text-xs font-mono font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Entry
                    </button>
                    <button
                      onClick={() => { 
                        setShowCompose(false); 
                        setComposeContent(''); 
                        localStorage.removeItem('mm_journal_draft');
                        setHasDraft(false);
                      }}
                      className="px-4 py-2.5 border border-border rounded-xl text-xs font-mono text-text-muted hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <span className="ml-auto text-[10px] text-text-muted/70 font-mono hidden sm:inline-flex items-center gap-1"><Command className="w-3 h-3" /><CornerDownLeft className="w-3 h-3" /> to save</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Entry list */}
          {filteredEntries.length > 0 ? (
            <div className="space-y-2">
              {filteredEntries.map(entry => {
                const isExpanded = expandedId === entry.id;
                const isEditing  = editingId  === entry.id;
                const MoodIcon   = MOOD_ICONS[entry.mood] || Smile;
                const lines      = entry.content.split('\n');
                const title      = lines[0]?.trim() || '';
                const preview    = lines.slice(1).join(' ').trim();
                const fName      = entry.folderId
                  ? folders.find(f => f.id === entry.folderId)?.name
                  : null;

                const style = MOOD_STYLES[entry.mood] || MOOD_STYLES.neutral;

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    className={`rounded-2xl border transition-all duration-200 ${
                      isExpanded
                        ? `${style.bgExpanded} shadow-lg shadow-black/10`
                        : `${style.bg} ${style.border}`
                    }`}
                  >
                    {/* Entry header */}
                    <div
                      className="flex items-start gap-3 p-4 cursor-pointer select-none"
                      onClick={() => toggleExpand(entry.id)}
                    >
                      <MoodIcon className={`w-4 h-4 ${style.text} mt-0.5 shrink-0`} />
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
                        {!isExpanded && preview && (
                          <p className="text-xs text-text-muted/50 mt-1 line-clamp-1 font-mono">{preview}</p>
                        )}
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-text-muted/30 shrink-0 mt-0.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>

                    {/* Expanded body */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-4">
                            <div className="h-px bg-border/50" />

                            {isEditing ? (
                              /* Edit mode */
                              <div className="space-y-3">
                                <MoodRow value={editMood} onChange={setEditMood} />

                                <textarea
                                  value={editContent}
                                  onChange={e => setEditContent(e.target.value)}
                                  autoFocus
                                  className="w-full min-h-[140px] resize-none bg-surface-2 rounded-xl border border-border p-3 font-mono text-sm leading-relaxed text-text-primary outline-none focus:border-accent transition-colors"
                                />

                                <div className="flex justify-between items-center text-[10px] font-mono text-text-muted/60 px-1 -mt-2">
                                  <span>{editContent.length} chars</span>
                                  <span>
                                    {editContent.trim() === '' ? 0 : editContent.trim().split(/\s+/).length} words
                                    {editContent.trim() !== '' && ` · ~${Math.max(1, Math.round(editContent.trim().split(/\s+/).length / 200))} min read`}
                                  </span>
                                </div>

                                <FolderPills folders={folders} value={editFolder} onChange={v => setEditFolder(v)} />

                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    disabled={!editContent.trim()}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-accent text-bg rounded-xl text-xs font-mono font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-xs font-mono text-text-muted hover:bg-surface-2 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" /> Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* View mode */
                              <div className="space-y-3">
                                <p className="font-mono text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                                  {entry.content}
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleCopy(entry.id, entry.content)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
                                  >
                                    {copiedId === entry.id ? (
                                      <>
                                        <Check className="w-3 h-3 text-accent" />
                                        <span className="text-accent">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => startEdit(entry)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" /> Edit
                                  </button>
                                  <Link
                                    href={`/app/letter?content=${encodeURIComponent(entry.content)}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
                                  >
                                    <Mail className="w-3 h-3" /> Send as Letter
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/40 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
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
              <button
                onClick={() => setShowCompose(true)}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-xl text-xs font-mono hover:bg-accent/15 transition-colors"
              >
                <Plus className="w-4 h-4" /> Write first entry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className="fixed bottom-24 right-6 z-50 bg-accent text-bg px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest"
          >
            <PenTool className="w-4 h-4" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
