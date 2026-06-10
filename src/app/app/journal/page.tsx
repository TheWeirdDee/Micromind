'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, PenTool, Trash2, Pencil, Check, X, Plus,
  Smile, Laugh, Meh, Angry, Frown, ChevronRight,
  FolderPlus, Folder as FolderIcon, MoreHorizontal, Sparkles, Lightbulb,
} from 'lucide-react';

const DAILY_PROMPTS = [
  "What's one thing that went better than expected today?",
  "Describe a moment this week when you felt fully present.",
  "What are you carrying right now that you need to put down?",
  "Who made you feel seen recently, and how?",
  "What small thing brought you unexpected joy today?",
  "What would you tell your past self from 6 months ago?",
  "What's a belief you've been questioning lately?",
  "Describe your energy today in three words — then explain why.",
  "What's one thing you keep avoiding, and what would happen if you just did it?",
  "Write about a place where you feel most like yourself.",
  "What are you grateful for that you rarely say out loud?",
  "What's the most honest thing you could say right now?",
  "What do you need more of this week? Less of?",
  "Write about a conversation that's been living in your head.",
  "What does rest look like for you, and are you getting enough of it?",
  "What's one fear you've overcome — and one you haven't yet?",
  "If this week had a theme, what would it be?",
  "What are you proud of that no one else knows about?",
  "What's the difference between who you are and who you're becoming?",
  "Write about something you changed your mind about recently.",
  "What do you wish people understood about you without you having to explain?",
  "Describe the last time you laughed until it hurt.",
  "What habit are you building, and is it actually working?",
  "What would a calmer version of yourself do differently today?",
  "Write about a relationship that has quietly shaped you.",
  "What are you chasing right now, and does it still feel worth it?",
  "What does your body need that your mind keeps ignoring?",
  "Write about a moment of unexpected kindness — given or received.",
  "What are you learning about yourself this month?",
  "If you could redo one decision from the last year, what and why?",
];

function getTodayPrompt(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}
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

export default function JournalPage() {
  const { address } = useWallet();

  // Data
  const [folders, setFolders]   = useState<Folder[]>([]);
  const [entries, setEntries]   = useState<JournalEntry[]>([]);

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

  const [toast, setToast] = useState<string | null>(null);

  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const composeRef        = useRef<HTMLTextAreaElement>(null);

  const refresh = () => {
    setFolders(getFolders());
    setEntries(getEntries());
  };

  useEffect(() => {
    refresh();
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
    setComposeFolder(activeFolderId ?? undefined);
  }, [activeFolderId]);

  const filteredEntries = activeFolderId === null
    ? entries
    : entries.filter(e => e.folderId === activeFolderId);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Folder handlers ───────────────────────────────────────────────────────

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

  // ── Entry handlers ────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!composeContent.trim()) return;
    saveEntry({ content: composeContent.trim(), mood: composeMood, folderId: composeFolder });
    updateStreak(address);
    setComposeContent('');
    setComposeMood('happy');
    setShowCompose(false);
    showToast('Entry saved');
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

  // ── Shared sub-renders ────────────────────────────────────────────────────

  const MoodRow = ({
    value, onChange,
  }: { value: string; onChange: (m: string) => void }) => (
    <div className="flex gap-2">
      {MOODS.map(m => (
        <button
          key={m.mood}
          type="button"
          onClick={() => onChange(m.mood)}
          title={m.label}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all ${
            value === m.mood
              ? 'bg-accent/15 border-accent'
              : 'border-border hover:bg-surface-2'
          }`}
        >
          <m.icon className={`w-4 h-4 ${value === m.mood ? 'text-accent' : 'text-text-muted'}`} />
        </button>
      ))}
    </div>
  );

  const FolderPills = ({
    value, onChange,
  }: { value: string | undefined; onChange: (id: string | undefined) => void }) => (
    folders.length === 0 ? null : (
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
    )
  );

  // ── Sidebar folder item ───────────────────────────────────────────────────

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

  // ── Active folder header label ─────────────────────────────────────────────

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
      {/* ── Page header ─────────────────────────────────────────────────── */}
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

      {/* ── Mobile folder tabs ──────────────────────────────────────────── */}
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

      {/* ── Desktop two-panel layout ─────────────────────────────────────── */}
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

        {/* ── Entries main panel ─────────────────────────────────────────── */}
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

          {/* Daily prompt card */}
          {!showCompose && (
            <button
              onClick={() => {
                setComposeContent(getTodayPrompt());
                setShowCompose(true);
              }}
              className="w-full text-left bg-accent/5 border border-accent/20 hover:border-accent/40 rounded-2xl px-4 py-3.5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5 group-hover:text-accent" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest font-mono text-accent/70 mb-1">Today's prompt</p>
                  <p className="text-sm text-text-primary/80 leading-snug">{getTodayPrompt()}</p>
                </div>
                <span className="text-[10px] font-mono text-accent/50 shrink-0 mt-0.5 group-hover:text-accent/80 transition-colors">
                  Write →
                </span>
              </div>
            </button>
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

                  <FolderPills value={composeFolder} onChange={v => setComposeFolder(v)} />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={!composeContent.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-bg rounded-xl text-xs font-mono font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Entry
                    </button>
                    <button
                      onClick={() => { setShowCompose(false); setComposeContent(''); }}
                      className="px-4 py-2.5 border border-border rounded-xl text-xs font-mono text-text-muted hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                    <span className="ml-auto text-[10px] text-text-muted/40 font-mono hidden sm:block">⌘↵ to save</span>
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

                return (
                  <motion.div
                    key={entry.id}
                    layout
                    className={`rounded-2xl border transition-all duration-200 ${
                      isExpanded
                        ? 'bg-surface border-accent/30 shadow-lg shadow-black/10'
                        : 'bg-surface-2/50 border-border hover:border-border/80 hover:bg-surface-2/80'
                    }`}
                  >
                    {/* Entry header */}
                    <div
                      className="flex items-start gap-3 p-4 cursor-pointer select-none"
                      onClick={() => toggleExpand(entry.id)}
                    >
                      <MoodIcon className="w-4 h-4 text-accent mt-0.5 shrink-0" />
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

                                <FolderPills value={editFolder} onChange={v => setEditFolder(v)} />

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
                                    onClick={() => startEdit(entry)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" /> Edit
                                  </button>
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
              <p className="text-xs font-mono text-text-muted/40 max-w-[240px]">
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
