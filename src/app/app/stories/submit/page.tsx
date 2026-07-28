'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Feather } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getActiveChallenge,
  getMySubmission,
  submitStory,
  updateStory,
  getChallengePhase,
  type StoryChallenge,
  type Story,
} from '@/lib/stories';

const TITLE_MIN = 1;
const TITLE_MAX = 120;
const CONTENT_MIN = 200;
const CONTENT_MAX = 8000;

export default function SubmitStoryPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [challenge, setChallenge] = useState<StoryChallenge | null>(null);
  const [existing, setExisting] = useState<Story | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const active = await getActiveChallenge();
      setChallenge(active);
      if (active) {
        const mine = await getMySubmission(active.id, user.id);
        setExisting(mine);
        if (mine) {
          setTitle(mine.title);
          setContent(mine.content);
        }
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const phase = challenge ? getChallengePhase(challenge) : null;
  const titleValid = title.trim().length >= TITLE_MIN && title.trim().length <= TITLE_MAX;
  const contentValid = content.trim().length >= CONTENT_MIN && content.trim().length <= CONTENT_MAX;
  const canSubmit = titleValid && contentValid && phase === 'submissions' && !saving;

  const handleSubmit = async () => {
    if (!user || !challenge || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await updateStory(existing.id, title.trim(), content.trim());
      } else {
        await submitStory(challenge.id, title.trim(), content.trim(), user.id);
      }
      router.push('/app/stories');
    } catch (e) {
      setError((e as Error).message || 'Failed to submit story');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/app/stories" className="text-text-muted hover:text-text-primary transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted mb-1">Community</p>
          <h1 className="text-2xl font-serif">{existing ? 'Edit Your Story' : 'Write Your Story'}</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-text-muted font-mono text-sm">Loading...</div>
      ) : !challenge || phase !== 'submissions' ? (
        <div className="bg-surface border border-border rounded-3xl p-8 text-center space-y-2">
          <Feather className="w-8 h-8 text-accent mx-auto" />
          <h3 className="font-serif text-lg">Submissions aren&apos;t open</h3>
          <p className="text-xs font-mono text-text-muted">
            {challenge ? "This challenge's submission window has closed." : 'There is no active challenge right now.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-4">
          <p className="text-xs font-mono text-text-muted italic">Prompt: {challenge.prompt}</p>

          <div className="space-y-1.5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Story title"
              maxLength={TITLE_MAX}
              className="w-full bg-bg/40 border border-border rounded-xl px-4 py-3 font-serif text-lg focus:outline-none focus:border-accent/50"
            />
            <p className="text-[10px] font-mono text-text-muted text-right">{title.length}/{TITLE_MAX}</p>
          </div>

          <div className="space-y-1.5">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Once upon a time..."
              rows={14}
              maxLength={CONTENT_MAX}
              className="w-full bg-bg/40 border border-border rounded-xl px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:border-accent/50"
            />
            <p className="text-[10px] font-mono text-text-muted text-right">
              {content.trim().length}/{CONTENT_MAX} (min {CONTENT_MIN})
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-accent hover:bg-accent-gold disabled:opacity-40 disabled:cursor-not-allowed text-bg font-serif text-lg font-bold py-4 rounded-2xl transition shadow-lg shadow-accent/15"
          >
            {saving ? 'Saving...' : existing ? 'Update Story' : 'Submit Story'}
          </button>
        </div>
      )}
    </motion.div>
  );
}
