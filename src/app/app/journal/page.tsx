'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trash2, BookOpen, PenTool, AlertCircle, Smile, Laugh, Meh, Angry, Frown } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { getEntries, saveEntry, deleteEntry, updateStreak, MOOD_ICONS, type JournalEntry } from '@/lib/journal';

const MOODS = [
  { mood: 'happy', icon: Smile, label: 'Happy' },
  { mood: 'excited', icon: Laugh, label: 'Excited' },
  { mood: 'neutral', icon: Meh, label: 'Neutral' },
  { mood: 'angry', icon: Angry, label: 'Angry' },
  { mood: 'sad', icon: Frown, label: 'Sad' },
];

export default function JournalPage() {
  const { address } = useWallet();
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('happy');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    saveEntry({
      content: content.trim(),
      mood: selectedMood,
    });

    // Update streak locally
    updateStreak(address);

    setContent('');
    setSelectedMood('happy');
    setEntries(getEntries());
    
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this journal entry?')) {
      deleteEntry(id);
      setEntries(getEntries());
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedEntries((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };



  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-24"
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Journal</p>
          <h2 className="text-4xl font-serif tracking-tight">Write without the clutter.</h2>
          <p className="max-w-3xl text-text-muted leading-relaxed">
            Your private journal lives on your device. Capture today’s thoughts with a softer, calmer interface.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border bg-surface-2 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">Entries</p>
          <p className="text-3xl font-serif mt-2">{entries.length}</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.9fr_1fr]">
        <section className="bg-surface border border-border p-6 rounded-[2rem] shadow-[0_24px_60px_rgba(0,0,0,0.16)]">
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">New entry</p>
            <h3 className="text-3xl font-serif mt-2">What’s on your mind today?</h3>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest">How are you feeling?</label>
                <span className="text-[10px] text-text-muted font-mono">Mood helps you glance back on patterns.</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {MOODS.map((m) => (
                  <button
                    key={m.mood}
                    type="button"
                    onClick={() => setSelectedMood(m.mood)}
                    className={`w-12 h-12 rounded-3xl flex items-center justify-center border transition-all ${
                      selectedMood === m.mood 
                        ? 'bg-accent/15 border-accent shadow-lg shadow-accent/10' 
                        : 'bg-surface-2 border-border hover:bg-surface-2/80'
                    }`}
                    title={m.label}
                  >
                    <m.icon className={`w-5 h-5 ${selectedMood === m.mood ? 'text-accent' : 'text-text-muted'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest">Write your thoughts</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What are you noticing, feeling, or grateful for today?"
                className="w-full min-h-[220px] resize-none rounded-[1.5rem] border border-border bg-surface-2 p-5 font-mono text-sm leading-7 text-text-primary outline-none transition-colors focus:border-accent"
              />
              <span className="absolute bottom-4 right-5 text-[10px] text-text-muted/70 font-mono">
                {content.length} chars
              </span>
            </div>

            <button
              type="submit"
              disabled={!content.trim()}
              className="pill-button pill-button-primary w-full py-4 disabled:opacity-40"
            >
              Save Entry
            </button>
          </form>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-border bg-surface-2 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
            <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Mood</p>
            <div className="mt-4 grid gap-3">
              {MOODS.map((m) => (
                <div key={m.mood} className="flex items-center gap-3 rounded-3xl border border-border px-4 py-3">
                  <m.icon className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-mono text-sm text-text-primary">{m.label}</p>
                    <p className="text-[10px] text-text-muted">Select the mood that matches your entry.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-surface-2 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
            <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Tip</p>
            <p className="mt-4 font-serif text-sm leading-relaxed text-text-primary">
              Start with a short sentence about how your day felt, then add one small detail you want to remember.
            </p>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className="fixed bottom-24 right-6 z-50 bg-accent text-bg px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest max-w-xs"
          >
            <PenTool className="w-4 h-4 shrink-0" />
            <span>Entry saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-serif">Your entries ({entries.length})</h3>
            <p className="text-sm text-text-muted">Review your private reflections in a calmer layout.</p>
          </div>
        </div>

        <div className="space-y-4">
          {entries.length > 0 ? (
            entries.map((entry) => {
              const isExpanded = expandedEntries[entry.id];
              return (
                <motion.div
                  key={entry.id}
                  layout
                  className="rounded-[2rem] border border-border bg-surface-2 p-6 transition hover:border-accent/30"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3 text-text-muted">
                      {(() => {
                        const Icon = MOOD_ICONS[entry.mood] || Smile;
                        return <Icon className="w-4 h-4 text-accent" />;
                      })()}
                      <span className="font-mono text-xs">{entry.date}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="inline-flex items-center justify-center rounded-full border border-border p-2 text-text-muted hover:text-red-400 hover:border-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className={`font-mono text-sm leading-relaxed text-text-primary whitespace-pre-wrap ${!isExpanded && 'line-clamp-3'}`}>
                      {entry.content}
                    </p>
                    {entry.content.length > 150 && (
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        className="text-xs font-mono text-accent hover:underline"
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-border bg-surface-2/40 p-10 text-center">
              <BookOpen className="mx-auto mb-4 h-10 w-10 text-text-muted/50" />
              <p className="font-mono text-sm text-text-muted">Your journal is empty. Write your first entry to begin.</p>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
