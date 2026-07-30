'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Trophy, Plus, Trash2, ArrowLeft, Pause, Play, Coins, Users, BookOpen, Feather, RotateCcw, Eye, EyeOff, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { SupportAdminPanel } from '@/components/app/SupportAdminPanel';
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
  fetchStakingStatus,
  setStakingPaused,
  fundStakingRewardPool,
  withdrawStakingExcess,
  setStakingParams,
  fetchLetterStats,
  retryAllFailedLetters,
  fetchChallengeSubmissions,
  moderateStory,
  fetchOverview,
  type AdminChallenge,
  type AdminEntry,
  type StakingStatus,
  type LetterStats,
  type AdminStory,
  type PlatformOverview,
} from '@/lib/admin';

function toLocalInputValue(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Decimal USDm string ("5.00") -> wei string, without floating-point error. */
function toWei(decimal: string, decimals = 18): string {
  const [whole, frac = ''] = decimal.trim().split('.');
  const paddedFrac = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const wei = BigInt(whole || '0') * BigInt(10) ** BigInt(decimals) + BigInt(paddedFrac || '0');
  return wei.toString();
}

/** wei string -> human decimal string, for display. */
function fromWei(wei: string, decimals = 18): string {
  const n = BigInt(wei);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = n / base;
  const frac = (n % base).toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** datetime-local inputs report an empty value until BOTH a date and a time
 * are picked — a bare date isn't enough. Defaulting all three to a full
 * date+time (noon, so it isn't mistaken for midnight-of-the-wrong-day in a
 * timezone) means the form is submittable immediately and the admin only
 * needs to adjust what they want to change. */
function defaultChallengeDates() {
  const open = new Date();
  open.setHours(12, 0, 0, 0);
  const close = new Date(open);
  close.setDate(close.getDate() + 21); // 3-week submission window
  const voteClose = new Date(close);
  voteClose.setDate(voteClose.getDate() + 7); // 1-week voting window
  return {
    submissionsOpenAt: toLocalInputValue(open),
    submissionsCloseAt: toLocalInputValue(close),
    votingCloseAt: toLocalInputValue(voteClose),
  };
}

export default function AdminDashboardPage() {
  const { session, user } = useAuth();

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [staking, setStaking] = useState<StakingStatus | null>(null);
  const [letterStats, setLetterStats] = useState<LetterStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [form, setForm] = useState({ title: '', prompt: '', ...defaultChallengeDates() });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paramsForm, setParamsForm] = useState({ stakeAmount: '', challengeDuration: '', requiredCheckins: '', rewardAmount: '' });

  const [expandedChallengeId, setExpandedChallengeId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<AdminStory[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const token = session?.access_token;

  const loadAll = useCallback(async () => {
    if (!token) return;
    try {
      const [c, a, o, s, l] = await Promise.all([
        fetchAdminChallenges(token),
        fetchAdmins(token),
        fetchOverview(token),
        fetchStakingStatus(token).catch(() => null),
        fetchLetterStats(token),
      ]);
      setChallenges(c);
      setAdmins(a);
      setOverview(o);
      setStaking(s);
      if (s) {
        setParamsForm({
          stakeAmount: fromWei(s.stakeAmount),
          challengeDuration: s.challengeDuration,
          requiredCheckins: s.requiredCheckins,
          rewardAmount: fromWei(s.rewardAmount),
        });
      }
      setLetterStats(l);
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
      setForm({ title: '', prompt: '', ...defaultChallengeDates() });
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

  const handleTogglePause = async () => {
    if (!token || !staking) return;
    setError(null);
    setBusy('pause');
    try {
      await setStakingPaused(token, !staking.relayerPaused);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleFundPool = async () => {
    if (!token || !fundAmount.trim()) return;
    setError(null);
    setBusy('fund');
    try {
      await fundStakingRewardPool(token, toWei(fundAmount.trim()));
      setFundAmount('');
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleWithdrawExcess = async () => {
    if (!token || !withdrawAmount.trim()) return;
    setError(null);
    setBusy('withdraw');
    try {
      await withdrawStakingExcess(token, toWei(withdrawAmount.trim()));
      setWithdrawAmount('');
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleSetParams = async () => {
    if (!token) return;
    setError(null);
    setBusy('params');
    try {
      await setStakingParams(token, {
        stakeAmountWei: toWei(paramsForm.stakeAmount),
        challengeDuration: paramsForm.challengeDuration,
        requiredCheckins: paramsForm.requiredCheckins,
        rewardAmountWei: toWei(paramsForm.rewardAmount),
      });
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleRetryAllFailed = async () => {
    if (!token) return;
    setError(null);
    setBusy('retry-all');
    try {
      await retryAllFailedLetters(token);
      await loadAll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleSubmissions = async (challengeId: string) => {
    if (!token) return;
    if (expandedChallengeId === challengeId) {
      setExpandedChallengeId(null);
      return;
    }
    setExpandedChallengeId(challengeId);
    setLoadingSubmissions(true);
    try {
      const stories = await fetchChallengeSubmissions(token, challengeId);
      setSubmissions(stories);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleModerateStory = async (storyId: string, status: 'published' | 'hidden') => {
    if (!token) return;
    setBusy(storyId);
    try {
      await moderateStory(token, storyId, status);
      setSubmissions((prev) => prev.map((s) => (s.id === storyId ? { ...s, status } : s)));
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

      {/* Platform Overview */}
      {overview && (
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3">
            <Users className="w-4 h-4 text-accent shrink-0" />
            <div>
              <p className="text-lg font-serif font-bold">{overview.profileCount}</p>
              <p className="text-[9px] font-mono uppercase text-text-muted">Accounts</p>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3">
            <BookOpen className="w-4 h-4 text-accent shrink-0" />
            <div>
              <p className="text-lg font-serif font-bold">{overview.entryCount}</p>
              <p className="text-[9px] font-mono uppercase text-text-muted">Journal entries</p>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3">
            <Feather className="w-4 h-4 text-accent shrink-0" />
            <div>
              <p className="text-lg font-serif font-bold">{overview.storyCount}</p>
              <p className="text-[9px] font-mono uppercase text-text-muted">Story submissions</p>
            </div>
          </div>
        </section>
      )}

      {/* Staking Contract */}
      <section className="space-y-4">
        <h2 className="text-sm font-mono uppercase tracking-widest text-text-muted">30-Day Staking Challenge</h2>
        {!staking ? (
          <p className="text-xs font-mono text-text-muted">Could not load on-chain staking status.</p>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            {!staking.isOwner && (
              <p className="text-xs font-mono text-red-400">
                Warning: the relayer wallet is not the contract owner — write actions below will fail.
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div><p className="text-text-muted uppercase text-[9px]">Stake</p><p>{fromWei(staking.stakeAmount)} USDm</p></div>
              <div><p className="text-text-muted uppercase text-[9px]">Duration</p><p>{staking.challengeDuration} days</p></div>
              <div><p className="text-text-muted uppercase text-[9px]">Required check-ins</p><p>{staking.requiredCheckins}</p></div>
              <div><p className="text-text-muted uppercase text-[9px]">Reward</p><p>{fromWei(staking.rewardAmount)} USDm</p></div>
              <div><p className="text-text-muted uppercase text-[9px]">Total staked</p><p>{fromWei(staking.totalStaked)} USDm</p></div>
              <div><p className="text-text-muted uppercase text-[9px]">Free reward pool</p><p>{fromWei(staking.freeRewardPool)} USDm</p></div>
              <div><p className="text-text-muted uppercase text-[9px]">Reserved rewards</p><p>{fromWei(staking.reservedRewards)} USDm</p></div>
              <div><p className="text-text-muted uppercase text-[9px]">Relayer gas</p><p className={Number(fromWei(staking.relayerCeloBalance)) < 0.02 ? 'text-red-400' : ''}>{fromWei(staking.relayerCeloBalance)} CELO</p></div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <div>
                <p className="text-xs font-mono">{staking.relayerPaused ? 'Relayer paused' : 'Relayer active'}</p>
                <p className="text-[9px] font-mono text-text-muted">Blocks new relayed stakes/check-ins only — withdrawals always work.</p>
              </div>
              <button
                onClick={handleTogglePause}
                disabled={busy === 'pause'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono border transition ${
                  staking.relayerPaused ? 'border-accent-green/40 text-accent-green hover:bg-accent-green/10' : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                }`}
              >
                {staking.relayerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {staking.relayerPaused ? 'Resume' : 'Pause'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/40">
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono text-text-muted uppercase">Fund reward pool (USDm, from relayer wallet)</p>
                <div className="flex gap-2">
                  <input value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} placeholder="0.50"
                    className="flex-1 bg-bg/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent/50" />
                  <button onClick={handleFundPool} disabled={!fundAmount.trim() || busy === 'fund'}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-accent text-bg text-xs font-mono disabled:opacity-40">
                    <Coins className="w-3.5 h-3.5" /> Fund
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono text-text-muted uppercase">Withdraw excess (USDm, to relayer wallet)</p>
                <div className="flex gap-2">
                  <input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder={fromWei(staking.freeRewardPool)}
                    className="flex-1 bg-bg/40 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent/50" />
                  <button onClick={handleWithdrawExcess} disabled={!withdrawAmount.trim() || busy === 'withdraw'}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-xs font-mono disabled:opacity-40">
                    Withdraw
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 space-y-2">
              <p className="text-[10px] font-mono text-text-muted uppercase">Update parameters (only affects challenges started after saving)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input value={paramsForm.stakeAmount} onChange={(e) => setParamsForm({ ...paramsForm, stakeAmount: e.target.value })} placeholder="Stake (USDm)"
                  className="bg-bg/40 border border-border rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-accent/50" />
                <input value={paramsForm.challengeDuration} onChange={(e) => setParamsForm({ ...paramsForm, challengeDuration: e.target.value })} placeholder="Duration (days)"
                  className="bg-bg/40 border border-border rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-accent/50" />
                <input value={paramsForm.requiredCheckins} onChange={(e) => setParamsForm({ ...paramsForm, requiredCheckins: e.target.value })} placeholder="Required check-ins"
                  className="bg-bg/40 border border-border rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-accent/50" />
                <input value={paramsForm.rewardAmount} onChange={(e) => setParamsForm({ ...paramsForm, rewardAmount: e.target.value })} placeholder="Reward (USDm)"
                  className="bg-bg/40 border border-border rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-accent/50" />
              </div>
              <button onClick={handleSetParams} disabled={busy === 'params'}
                className="text-xs font-mono px-3 py-2 rounded-xl border border-accent/40 text-accent hover:bg-accent/10 transition disabled:opacity-40">
                {busy === 'params' ? 'Saving...' : 'Save Parameters'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Letters */}
      <section className="space-y-4">
        <h2 className="text-sm font-mono uppercase tracking-widest text-text-muted">Escrow Letters</h2>
        {!letterStats ? (
          <p className="text-xs font-mono text-text-muted">Loading...</p>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div><p className="text-lg font-serif font-bold">{letterStats.counts.pending}</p><p className="text-[9px] font-mono uppercase text-text-muted">Pending</p></div>
              <div><p className="text-lg font-serif font-bold">{letterStats.counts.processing}</p><p className="text-[9px] font-mono uppercase text-text-muted">Processing</p></div>
              <div><p className="text-lg font-serif font-bold text-accent-green">{letterStats.counts.sent}</p><p className="text-[9px] font-mono uppercase text-text-muted">Sent</p></div>
              <div><p className="text-lg font-serif font-bold text-red-400">{letterStats.counts.failed}</p><p className="text-[9px] font-mono uppercase text-text-muted">Failed</p></div>
            </div>
            {letterStats.failed.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono text-text-muted uppercase">Failed letters</p>
                  <button onClick={handleRetryAllFailed} disabled={busy === 'retry-all'}
                    className="flex items-center gap-1.5 text-xs font-mono text-accent hover:underline disabled:opacity-40">
                    <RotateCcw className="w-3 h-3" /> {busy === 'retry-all' ? 'Retrying...' : 'Retry All'}
                  </button>
                </div>
                {letterStats.failed.slice(0, 10).map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-[11px] font-mono py-1">
                    <span>{l.recipient_email} · from {l.sender_name} · {l.attempts} attempt{l.attempts === 1 ? '' : 's'}</span>
                    <span className="text-text-muted">{new Date(l.release_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

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
          <p className="text-[10px] font-mono text-text-muted/70">
            Defaults to a 3-week submission window + 1-week voting window starting today — each field needs both a date AND a time to count, so adjust the time on any field you change.
          </p>
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
              const isExpanded = expandedChallengeId === c.id;
              return (
                <div key={c.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-serif text-sm font-bold">{c.title}</p>
                      <p className="text-[10px] font-mono text-text-muted mt-0.5">
                        {phase} · {c.submission_count} submissions · {c.total_votes} votes
                        {c.winner_title && <> · <Trophy className="inline w-3 h-3 text-accent" /> {c.winner_title}</>}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleSubmissions(c.id)}
                        className="flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary transition"
                      >
                        Submissions <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {canFinalize && (
                        <button
                          onClick={() => handleFinalize(c.id)}
                          disabled={busy === c.id}
                          className="text-xs font-mono px-3 py-1.5 rounded-lg border border-accent/40 text-accent hover:bg-accent/10 transition"
                        >
                          {busy === c.id ? 'Finalizing...' : 'Finalize'}
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border/60 bg-bg/30 p-4 space-y-2">
                      {loadingSubmissions ? (
                        <p className="text-xs font-mono text-text-muted">Loading...</p>
                      ) : submissions.length === 0 ? (
                        <p className="text-xs font-mono text-text-muted">No submissions.</p>
                      ) : (
                        submissions.map((s) => (
                          <div key={s.id} className={`flex items-center justify-between gap-3 text-xs font-mono py-1.5 ${s.status === 'hidden' ? 'opacity-40' : ''}`}>
                            <span>
                              <span className="font-bold">{s.title}</span> by {s.author_username ?? 'anonymous'} · {s.vote_count} votes
                              {s.status === 'hidden' && ' · hidden'}
                            </span>
                            <button
                              onClick={() => handleModerateStory(s.id, s.status === 'hidden' ? 'published' : 'hidden')}
                              disabled={busy === s.id}
                              className="flex items-center gap-1 text-text-muted hover:text-accent transition shrink-0"
                              title={s.status === 'hidden' ? 'Publish' : 'Hide'}
                            >
                              {s.status === 'hidden' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {token && <SupportAdminPanel token={token} />}

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
