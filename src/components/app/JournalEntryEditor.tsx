'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  ChevronLeft, Check, X, Pencil, Trash2, Mail, Copy,
  Smile, Laugh, Meh, Angry, Frown, Sparkles,
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import {
  getEntries, saveEntry, editEntry, deleteEntry, getFolders, updateStreak, MOOD_ICONS,
  type JournalEntry, type Folder,
} from '@/lib/journal';
import { uploadJournalImage, deleteJournalImage, fetchJournalImage } from '@/lib/journalMedia';
import { PhotoAttachButton, VoiceRecordButton, EntryImage } from './JournalMediaControls';
import { MarkdownToolbar } from './MarkdownToolbar';
import { THERAPEUTIC_PROMPTS, DEFAULT_PROMPTS } from '@/constants/prompts';

const MOODS = [
  { mood: 'happy',   icon: Smile,  label: 'Happy'   },
  { mood: 'excited', icon: Laugh,  label: 'Excited' },
  { mood: 'neutral', icon: Meh,    label: 'Neutral' },
  { mood: 'angry',   icon: Angry,  label: 'Angry'   },
  { mood: 'sad',     icon: Frown,  label: 'Sad'     },
];

const MOOD_TEXT: Record<string, string> = {
  happy: 'text-accent',
  excited: 'text-accent-gold',
  neutral: 'text-text-muted',
  sad: 'text-blue-400',
  angry: 'text-red-400',
};

function MoodRow({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div className="flex gap-2.5">
      {MOODS.map(m => (
        <motion.button
          key={m.mood}
          type="button"
          whileHover={{ scale: 1.15, rotate: value === m.mood ? 0 : [0, -5, 5, 0] }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(m.mood)}
          title={m.label}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
            value === m.mood
              ? 'bg-accent/15 border-accent shadow-sm shadow-accent/10'
              : 'border-border hover:bg-surface-2 hover:border-text-muted/30'
          }`}
        >
          <m.icon className={`w-5 h-5 transition-colors ${value === m.mood ? 'text-accent' : 'text-text-muted'}`} />
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

interface JournalEntryEditorProps {
  mode: 'new' | 'edit';
  entryId?: string;
}

export function JournalEntryEditor({ mode, entryId }: JournalEntryEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useWallet();

  const [folders, setFolders] = useState<Folder[]>(() => (typeof window !== 'undefined' ? getFolders() : []));
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [isEditing, setIsEditing] = useState(mode === 'new');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('happy');
  const [folderId, setFolderId] = useState<string | undefined>(undefined);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [hasExistingImage, setHasExistingImage] = useState(false);

  const [showPrompts, setShowPrompts] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [textareaFocused, setTextareaFocused] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing entry (edit mode) or a saved draft (new mode)
  useEffect(() => {
    if (mode === 'edit' && entryId) {
      const found = getEntries().find(e => e.id === entryId);
      if (!found) { setNotFound(true); return; }
      setEntry(found);
      setContent(found.content);
      setMood(found.mood);
      setFolderId(found.folderId);
      setHasExistingImage(!!found.image);
      if (found.image) {
        fetchJournalImage(found.image).then(url => { if (url) setImagePreviewUrl(url); });
      }
    } else if (mode === 'new') {
      const initialFolder = searchParams.get('folder') ?? undefined;
      try {
        const draftStr = localStorage.getItem('mm_journal_draft');
        if (draftStr) {
          const draft = JSON.parse(draftStr);
          setContent(draft.content || '');
          setMood(draft.mood || 'happy');
          setFolderId(draft.folderId || initialFolder);
          return;
        }
      } catch {}
      setFolderId(initialFolder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, entryId]);

  // Draft autosave, new-entry mode only
  useEffect(() => {
    if (mode !== 'new') return;
    if (content.trim() !== '') {
      localStorage.setItem('mm_journal_draft', JSON.stringify({ content, mood, folderId }));
    } else {
      localStorage.removeItem('mm_journal_draft');
    }
  }, [mode, content, mood, folderId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const getCurrentPrompt = () => {
    const list = THERAPEUTIC_PROMPTS[mood] || DEFAULT_PROMPTS;
    return list[promptIndex % list.length]?.text || '';
  };

  const handleUsePrompt = () => {
    const promptText = getCurrentPrompt();
    if (!promptText) return;
    setContent(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${promptText}\n\n` : `${promptText}\n\n`;
    });
    textareaRef.current?.focus();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);

    if (mode === 'new') {
      const newEntry = saveEntry({ content: content.trim(), mood, folderId });
      updateStreak(address);

      if (imageFile) {
        try {
          const envelope = await uploadJournalImage(newEntry.id, imageFile);
          editEntry(newEntry.id, { image: envelope });
        } catch (err) {
          console.warn('Image upload failed', err);
        }
      }

      localStorage.removeItem('mm_journal_draft');
      router.replace(`/app/journal/${newEntry.id}`);
      return;
    }

    if (!entryId) return;
    const updates: Partial<Pick<JournalEntry, 'content' | 'mood' | 'folderId' | 'image' | 'tags'>> = {
      content: content.trim(), mood, folderId,
    };

    let message = 'Entry updated';
    if (imageFile) {
      try {
        updates.image = await uploadJournalImage(entryId, imageFile);
      } catch (err) {
        console.warn('Image upload failed', err);
        message = 'Entry updated, but image upload failed';
      }
    } else if (!hasExistingImage && entry?.image) {
      deleteJournalImage(entry.image).catch(() => {});
      updates.image = undefined;
    }

    editEntry(entryId, updates);
    setEntry(prev => (prev ? { ...prev, ...updates } : prev));
    setImageFile(null);
    setIsEditing(false);
    setSaving(false);
    showToast(message);
  };

  const handleCancelEdit = () => {
    if (!entry) return;
    setContent(entry.content);
    setMood(entry.mood);
    setFolderId(entry.folderId);
    setImageFile(null);
    setHasExistingImage(!!entry.image);
    if (entry.image) {
      fetchJournalImage(entry.image).then(url => { if (url) setImagePreviewUrl(url); });
    } else {
      setImagePreviewUrl(null);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!entryId) return;
    if (!window.confirm('Delete this entry?')) return;
    if (entry?.image) deleteJournalImage(entry.image).catch(() => {});
    deleteEntry(entryId);
    router.back();
  };

  if (notFound) {
    return (
      <div className="fixed inset-0 z-[100] bg-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-serif text-lg text-text-primary/70">Entry not found.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-accent text-bg rounded-xl text-xs font-mono font-bold"
        >
          Back to Journal
        </button>
      </div>
    );
  }

  const MoodIcon = MOOD_ICONS[mood] || Smile;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-bg flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {entry && (
          <span className="text-[11px] text-text-muted/60 font-mono truncate">{entry.date}</span>
        )}

        {isEditing ? (
          <div className="flex items-center gap-1">
            {mode === 'edit' && (
              <button
                onClick={handleCancelEdit}
                className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!content.trim() || saving}
              className="p-2 rounded-full bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 disabled:opacity-40 transition-colors"
              aria-label="Save"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
              aria-label="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full text-text-muted hover:text-red-400 hover:bg-red-900/20 transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEditing ? (
          <>
            <MoodRow value={mood} onChange={m => { setMood(m); setPromptIndex(0); }} />

            {mode === 'new' && (
              <div className="border border-border/60 rounded-xl p-3 bg-surface-2/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
                    <span className="text-xs font-mono text-text-primary">Guided Writing Prompt</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowPrompts(!showPrompts); setPromptIndex(0); }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                      showPrompts ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-muted hover:bg-surface-2'
                    }`}
                  >
                    {showPrompts ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                {showPrompts && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <p className="text-xs text-text-primary leading-relaxed italic">{"“" + getCurrentPrompt() + "”"}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPromptIndex(prev => prev + 1)}
                        className="text-[9px] font-mono px-2 py-1 bg-surface border border-border rounded-lg hover:border-text-muted/30 text-text-muted transition-all"
                      >
                        Next Prompt
                      </button>
                      <button
                        type="button"
                        onClick={handleUsePrompt}
                        className="text-[9px] font-mono px-2 py-1 bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 text-accent transition-all"
                      >
                        Use Prompt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
              autoFocus={mode === 'new'}
              placeholder="What's on your mind today?"
              className="w-full min-h-[200px] resize-none bg-transparent font-mono text-sm leading-relaxed text-text-primary outline-none"
            />

            <div className="flex justify-between items-center text-[10px] font-mono text-text-muted/60 px-1">
              <span>{content.length} chars</span>
              <span>
                {content.trim() === '' ? 0 : content.trim().split(/\s+/).length} words
                {content.trim() !== '' && ` · ~${Math.max(1, Math.round(content.trim().split(/\s+/).length / 200))} min read`}
              </span>
            </div>

            <FolderPills folders={folders} value={folderId} onChange={setFolderId} />

            <div className="flex items-center gap-2 flex-wrap">
              <PhotoAttachButton
                previewUrl={imagePreviewUrl}
                onSelect={file => {
                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                  setImageFile(file);
                  setImagePreviewUrl(URL.createObjectURL(file));
                }}
                onRemove={() => {
                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                  setImageFile(null);
                  setImagePreviewUrl(null);
                  setHasExistingImage(false);
                }}
              />
              <VoiceRecordButton
                onTranscribed={text => setContent(prev => (prev.trim() ? `${prev.trim()}\n\n${text}` : text))}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <MoodIcon className={`w-4 h-4 ${MOOD_TEXT[mood] || 'text-text-muted'}`} />
              {folderId && (
                <span className="text-[11px] text-accent/60 font-mono">
                  {folders.find(f => f.id === folderId)?.name}
                </span>
              )}
            </div>

            <div className="prose prose-invert prose-sm max-w-none font-mono prose-p:leading-relaxed prose-li:my-0">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>

            {entry?.image && <EntryImage raw={entry.image} />}

            <div className="flex gap-2 flex-wrap pt-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
              >
                {copied ? (
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
              <Link
                href={`/app/letter?content=${encodeURIComponent(content)}`}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
              >
                <Mail className="w-3 h-3" /> Send as Letter
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Markdown toolbar — appears above the keyboard while the textarea is focused */}
      {isEditing && textareaFocused && (
        <div className="shrink-0">
          <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] bg-accent text-bg px-4 py-2.5 rounded-xl shadow-xl font-mono text-[10px] uppercase tracking-widest"
        >
          {toast}
        </motion.div>
      )}
    </motion.div>
  );
}
