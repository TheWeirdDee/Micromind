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
      className="space-y-8 pb-24"
    >
      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-serif">My Journal</h2>
        </div>
        <span className="text-[10px] font-mono text-accent px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
          Free
        </span>
      </header>

      {/* Write section */}
      <section className="bg-surface border border-border p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
        
        <form onSubmit={handleSave} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">How are you feeling today?</label>
            <div className="flex gap-3 justify-between md:justify-start">
              {MOODS.map((m) => (
                <button
                  key={m.mood}
                  type="button"
                  onClick={() => setSelectedMood(m.mood)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                    selectedMood === m.mood 
                      ? 'bg-accent/10 border-accent scale-110 shadow-lg shadow-accent/5' 
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
            <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Write your thoughts</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind today? Write freely, everything stays private on your device..."
              className="w-full bg-surface-2 border border-border rounded-xl p-4 font-mono text-sm min-h-[160px] focus:border-accent outline-none transition-colors resize-none"
            />
            <span className="absolute bottom-3 right-3 font-mono text-[10px] text-text-muted/60">
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

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className="fixed bottom-24 right-6 z-50 bg-accent text-bg px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest max-w-xs"
          >
            <PenTool className="w-4 h-4 shrink-0" />
            <span>Entry Saved!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries List */}
      <section className="space-y-4">
        <h3 className="font-serif text-xl px-2">Your Entries ({entries.length})</h3>
        
        <div className="space-y-3">
          {entries.length > 0 ? (
            entries.map((entry) => {
              const isExpanded = expandedEntries[entry.id];
              return (
                <motion.div
                  key={entry.id}
                  layout
                  className="bg-surface border border-border rounded-2xl p-5 hover:border-text-muted/40 transition-colors"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = MOOD_ICONS[entry.mood] || Smile;
                        return <Icon className="w-4 h-4 text-accent" />;
                      })()}
                      <span className="text-xs font-mono text-text-muted">
                        {entry.date}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 hover:bg-surface-2 rounded-lg text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <p className={`font-mono text-sm leading-relaxed text-text-primary whitespace-pre-wrap ${!isExpanded && 'line-clamp-3'}`}>
                      {entry.content}
                    </p>
                    {entry.content.length > 150 && (
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        className="text-xs font-mono text-accent hover:underline focus:outline-none"
                      >
                        {isExpanded ? 'Show Less' : 'Show More...'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-surface-2/40">
              <BookOpen className="w-8 h-8 text-text-muted/50 mb-3" />
              <p className="font-mono text-xs text-text-muted italic">
                Your journal is empty. Write your first entry above.
              </p>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
