'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Feather, Loader2, PenLine, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;

const QUICK_TOPICS = [
  'Grief & loss',
  'A big life transition',
  'Anxiety about the future',
  'A relationship',
  'Career & purpose',
  'Gratitude',
  'Self-compassion',
  'Anger I need to process',
];

export default function TherapeuticWritingPage() {
  const { session, user } = useAuth();
  const router = useRouter();

  const [topic, setTopic] = useState('');
  const [prompts, setPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = topic.trim().length > 0 && !loading;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    if (!session?.access_token) {
      setError('Please log in to get tailored prompts.');
      return;
    }
    setLoading(true);
    setError(null);
    setPrompts([]);

    try {
      const res = await fetch(`${agentUrl}/api/therapeutic/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to generate prompts');
      setPrompts(body.prompts ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUsePrompt = (prompt: string) => {
    try {
      localStorage.setItem('mm_journal_draft', JSON.stringify({ content: `${prompt}\n\n`, mood: 'neutral' }));
    } catch {}
    router.push('/app/journal/new');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted mb-1">Free</p>
          <h1 className="text-2xl font-serif">Therapeutic Writing</h1>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 text-xs font-mono text-text-muted leading-relaxed flex items-start gap-2">
        <Feather className="w-4 h-4 shrink-0 text-accent mt-0.5" />
        <span>This won&apos;t write your journal entry for you — it gives you a tailored starting point so you can find the words yourself.</span>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-1">
            What do you want to explore today?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. I'm starting a new job next week and feel anxious about it..."
            rows={3}
            maxLength={300}
            className="w-full bg-surface-2 border border-border rounded-xl p-4 font-mono text-sm resize-none focus:border-accent outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className="px-3 py-1.5 bg-surface-2 border border-border rounded-full text-xs font-mono text-text-muted hover:border-accent/40 hover:text-accent transition-all"
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate || !user}
          className="w-full pill-button pill-button-primary py-4 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-mono text-xs uppercase tracking-wider">Finding your prompts...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{user ? 'Get Tailored Prompts' : 'Log in to Continue'}</span>
            </>
          )}
        </button>

        {error && <p className="text-xs font-mono text-red-400">{error}</p>}
      </div>

      {prompts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-serif text-lg px-1">Prompts for you</h2>
          {prompts.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-surface border border-border rounded-2xl p-5 space-y-3 hover:border-accent/20 transition-colors"
            >
              <p className="text-sm text-text-primary leading-relaxed font-serif">{p}</p>
              <button
                onClick={() => handleUsePrompt(p)}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-accent hover:underline"
              >
                <PenLine className="w-3.5 h-3.5" />
                Use this prompt
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
