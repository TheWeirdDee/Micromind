'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Trophy, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getChallengePhase } from '@/lib/stories';
import {
  checkIsAdmin,
  fetchAdminChallenges,
  openChallenge,
  finalizeChallenge,
  fetchAdmins,
  addAdmin,
  removeAdmin,
  type AdminChallenge,
  type AdminEntry,
} from '@/lib/admin';

function toLocalInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AdminDashboardPage() {
  const { session, user } = useAuth();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [form, setForm] = useState({ title: '', prompt: '', submissionsOpenAt: '', submissionsCloseAt: '', votingCloseAt: '' });
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const token = session?.access_token;

  const loadAll = useCallback(async () => {
    if (!token) return;
    try {
      const [c, a] = await Promise.all([fetchAdminChallenges(token), fetchAdmins(token)]);
      setChallenges(c);
      setAdmins(a);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    checkIsAdmin(token)
      .then((ok) => {
        setIsAdmin(ok);
        if (ok) loadAll();
      })
      .finally(() => setChecking(false));
  }, [token, loadAll]);

  const handleOpenChallenge = async () => {
    if (!token) return;
    setError(null);
    setBusy('open');
    try {
      await openChallenge(token, {
        title: form.title,
        prompt: form.prompt,
        submissionsOpenAt: new Date(form.submissionsOpenAt).toISOString(),
        submissionsCloseAt: new Date(form.submissionsCloseAt).toISOString(),
        votingCloseAt: new Date(form.votingCloseAt).toISOString(),
      });
      setForm({ title: '', prompt: '', submissionsOpenAt: '', submissionsCloseAt: '', votingCloseAt: '' });
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleFinalize = async (challengeId: string) => {
    if (!token) return;
    setError(null);
    setBusy(challengeId);
    try {
      await finalizeChallenge(token, challengeId);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleAddAdmin = async () => {
    if (!token || !newAdminEmail.trim()) return;
    setError(null);
    setBusy('add-admin');
    try {
      await addAdmin(token, newAdminEmail.trim());
      setNewAdminEmail('');
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!token) return;
    setError(null);
    setBusy(userId);
    try {
      await removeAdmin(token, userId);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (checking) {
    return <div className="text-center py-24 text-text-muted font-mono text-sm">Checking access...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-24 space-y-3">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
        <h1 className="font-serif text-xl">Not authorized</h1>
        <p className="text-xs font-mono text-text-muted">This page is restricted to MicroMind admins.</p>
        <Link href="/app" className="inline-block text-xs font-mono text-accent hover:underline mt-2">Back to app</Link>
      </div>
    );
  }

  const formValid = form.title.trim() && form.prompt.trim() && form.submissionsOpenAt && form.submissionsCloseAt && form.votingCloseAt;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/app" className="text-text-muted hover:text-text-primary transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-accent" /> Admin
          </p>
          <h1 className="text-2xl font-serif">Dashboard</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-sm text-red-400 font-mono">{error}</div>
      )}

      {/* Story Challenges */}
      <section className="space-y-4">
        <h2 className="text-sm font-mono uppercase tracking-widest text-text-muted">Story Challenges</h2>

        <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-mono text-text-muted">Open a new challenge</p>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title (e.g. August 2026: New Beginnings)"
            className="w-full bg-bg/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-accent/50"
          />
          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            placeholder="Prompt / theme"
            rows={2}
            className="w-full bg-bg/40 border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-accent/50"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-mono text-text-muted uppercase">Submissions open</span>
              <input
                type="datetime-local"
                value={form.submissionsOpenAt}
                onChange={(e) => setForm({ ...form, submissionsOpenAt: e.target.value })}
                className="w-full bg-bg/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent/50"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-mono text-text-muted uppercase">Submissions close</span>
              <input
                type="datetime-local"
                value={form.submissionsCloseAt}
                onChange={(e) => setForm({ ...form, submissionsCloseAt: e.target.value })}
                className="w-full bg-bg/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent/50"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-mono text-text-muted uppercase">Voting closes</span>
              <input
                type="datetime-local"
                value={form.votingCloseAt}
                onChange={(e) => setForm({ ...form, votingCloseAt: e.target.value })}
                className="w-full bg-bg/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent/50"
              />
            </label>
          </div>
          <button
            onClick={handleOpenChallenge}
            disabled={!formValid || busy === 'open'}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-gold disabled:opacity-40 disabled:cursor-not-allowed text-bg font-serif text-sm font-bold px-4 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            {busy === 'open' ? 'Opening...' : 'Open Challenge'}
          </button>
        </div>

        <div className="space-y-2">
          {challenges.length === 0 ? (
            <p className="text-xs font-mono text-text-muted text-center py-6">No challenges yet.</p>
          ) : (
            challenges.map((c) => {
              const phase = getChallengePhase(c);
              const canFinalize = phase === 'ended' && !c.winner_story_id;
              return (
                <div key={c.id} className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-serif text-sm font-bold">{c.title}</p>
                    <p className="text-[10px] font-mono text-text-muted mt-0.5">
                      {phase} · {c.submission_count} submissions · {c.total_votes} votes
                      {c.winner_title && <> · <Trophy className="inline w-3 h-3 text-accent" /> {c.winner_title}</>}
                    </p>
                  </div>
                  {canFinalize && (
                    <button
                      onClick={() => handleFinalize(c.id)}
                      disabled={busy === c.id}
                      className="text-xs font-mono px-3 py-1.5 rounded-lg border border-accent/40 text-accent hover:bg-accent/10 transition shrink-0"
                    >
                      {busy === c.id ? 'Finalizing...' : 'Finalize'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Admins */}
      <section className="space-y-4">
        <h2 className="text-sm font-mono uppercase tracking-widest text-text-muted">Admins</h2>
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
          <div className="flex gap-2">
            <input
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 bg-bg/40 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
            />
            <button
              onClick={handleAddAdmin}
              disabled={!newAdminEmail.trim() || busy === 'add-admin'}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-gold disabled:opacity-40 text-bg font-serif text-sm font-bold px-4 py-2 rounded-xl transition"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <p className="text-[10px] font-mono text-text-muted">The email must already have a MicroMind account.</p>

          <div className="space-y-1.5 pt-2 border-t border-border/40">
            {admins.map((a) => (
              <div key={a.user_id} className="flex items-center justify-between text-xs font-mono py-1.5">
                <span>{a.email}{a.user_id === user?.id && ' (you)'}</span>
                <button
                  onClick={() => handleRemoveAdmin(a.user_id)}
                  disabled={busy === a.user_id || admins.length <= 1}
                  className="text-text-muted hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title={admins.length <= 1 ? "Can't remove the last admin" : 'Remove admin'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
