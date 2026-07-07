'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Lock, CheckCircle2, ShieldCheck, HelpCircle, Sparkles, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useStakingChallenge } from '@/hooks/useStakingChallenge';
import { useWallet } from '@/context/WalletContext';
import { getLastEntry } from '@/lib/journal';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 95, damping: 14 } },
} as const;

export default function ChallengePage() {
  const { address } = useWallet();
  const {
    challenge,
    checkedInDays,
    params,
    step,
    error,
    txHash,
    isDeployed,
    hasCheckedInToday,
    getDaysRemaining,
    joinChallenge,
    checkIn,
    withdraw,
  } = useStakingChallenge();

  const latestEntry = typeof window !== 'undefined' ? getLastEntry() : null;

  // Helper to check if latest journal entry was written today
  const hasJournaledToday = () => {
    if (!latestEntry) return false;
    const entryDate = new Date(latestEntry.timestamp).toDateString();
    const todayDate = new Date().toDateString();
    return entryDate === todayDate;
  };

  const handleCheckIn = () => {
    if (!latestEntry) return;
    checkIn(latestEntry.content);
  };

  // Status mapping
  const renderStepHint = () => {
    switch (step) {
      case 'approving':
        return 'Please approve the USDm stake transfer in your wallet...';
      case 'signing':
        return 'Please sign the EIP-712 gasless authorization request...';
      case 'submitting':
        return 'Submitting signature to the gasless backend relayer...';
      case 'confirming':
        return 'Waiting for transaction confirmation on Celo mainnet...';
      case 'complete':
        return 'Transaction confirmed! State updated successfully.';
      default:
        return '';
    }
  };

  // Render registration view
  const renderRegister = () => {
    const stakeFormatted = params ? (Number(params.stakeAmount) / 1e18).toFixed(2) : '5.00';
    const rewardFormatted = params ? (Number(params.rewardAmount) / 1e18).toFixed(2) : '0.50';
    const durationDays = params ? params.challengeDuration : 30;
    const requiredDays = params ? params.requiredCheckins : 25;

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Hero Card */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2.5rem] border border-border bg-gradient-to-br from-accent/10 to-surface p-8 shadow-2xl text-center">
          <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
          <div className="relative z-10 space-y-4 max-w-xl mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-accent text-bg shadow-xl shadow-accent/20">
              <Flame className="w-8 h-8 animate-pulse" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-accent font-bold">Web3 Habit Loop</span>
            <h1 className="text-3xl font-serif tracking-tight">Morning Pages Challenge</h1>
            <p className="font-mono text-sm text-text-muted leading-relaxed">
              Build a daily writing habit on Celo. Lock a stake in smart escrow. Complete your daily pages, earn yield rewards, and withdraw your principal 100% safe.
            </p>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-accent">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-serif text-base font-semibold">100% Lossless</h3>
            </div>
            <p className="text-xs text-text-muted font-mono leading-relaxed">
              Your principal stake is never cut or slashed. Whether you write every day or miss some, your capital remains completely safe for withdrawal at the end.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-accent">
              <Flame className="w-5 h-5" />
              <h3 className="font-serif text-base font-semibold">Gamified Commitment</h3>
            </div>
            <p className="text-xs text-text-muted font-mono leading-relaxed">
              Check in daily by locking a SHA-256 cryptographic hash of your journal entry on-chain. Keep your streak alive without storing personal text.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-serif text-base font-semibold">Finisher Rewards</h3>
            </div>
            <p className="text-xs text-text-muted font-mono leading-relaxed">
              Write at least {requiredDays} out of {durationDays} days to finish the challenge successfully. Finishers split the reward pool and claim extra stablecoin yield!
            </p>
          </div>
        </motion.div>

        {/* Action Panel */}
        <motion.div variants={itemVariants} className="bg-surface-2 border border-border rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Escrow Parameters</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-accent">{stakeFormatted} USDm</span>
                <span className="text-xs text-text-muted font-mono">required stake</span>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Target Yield Incentive</p>
              <p className="text-xl font-bold font-mono text-text-primary mt-1">+{rewardFormatted} USDm</p>
            </div>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-xs font-mono bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step !== 'idle' && step !== 'complete' && step !== 'error' ? (
              <div className="space-y-2 text-center p-4">
                <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-text-muted mt-2 animate-pulse">{renderStepHint()}</p>
              </div>
            ) : (
              <button
                onClick={joinChallenge}
                className="w-full bg-accent hover:bg-accent-gold text-bg font-serif text-lg font-bold py-4 rounded-2xl transition shadow-lg shadow-accent/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-5 h-5" />
                Approve & Stake {stakeFormatted} USDm
              </button>
            )}

            <p className="text-[10px] text-text-muted font-mono leading-relaxed text-center">
              Requires a one-time approval transaction (negligible CELO gas), followed by a gasless signature. Double-check your wallet balances first.
            </p>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Render active challenge view
  const renderActive = () => {
    if (!challenge || !params) return null;

    const daysRemaining = getDaysRemaining();
    const checkedInToday = hasCheckedInToday();
    const durationDays = params.challengeDuration;
    const requiredDays = params.requiredCheckins;

    // Calculate dates
    const startDateLabel = new Date(challenge.startTime * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endDateLabel = new Date((challenge.startTime + (durationDays * 86400)) * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Generate grid items
    const elapsed = Math.floor(Date.now() / 1000) - challenge.startTime;
    const currentDayIndex = Math.floor(elapsed / 86400);

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* Header Summary */}
        <motion.div variants={itemVariants} className="bg-surface border border-border p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase bg-accent/20 border border-accent/30 px-2 py-0.5 rounded text-accent font-bold">Active Commitment</span>
                <span className="text-xs font-mono text-text-muted">{startDateLabel} — {endDateLabel}</span>
              </div>
              <h1 className="text-2xl font-serif tracking-tight">Morning Pages Escrow</h1>
            </div>

            <div className="flex gap-4">
              <div className="bg-bg/60 border border-border/80 px-4 py-2.5 rounded-2xl min-w-[90px] text-center">
                <p className="text-[9px] font-mono uppercase text-text-muted">Streaks</p>
                <p className="text-xl font-bold font-mono text-accent mt-0.5">{challenge.checkInCount} / {requiredDays}</p>
              </div>
              <div className="bg-bg/60 border border-border/80 px-4 py-2.5 rounded-2xl min-w-[90px] text-center">
                <p className="text-[9px] font-mono uppercase text-text-muted">Days Left</p>
                <p className="text-xl font-bold font-mono text-text-primary mt-0.5">{daysRemaining}d</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Panel */}
        <motion.div variants={itemVariants} className="bg-surface-2 border border-border rounded-3xl p-6 space-y-5">
          <h3 className="text-base font-serif font-semibold border-b border-border/40 pb-3">Daily Habit Check-In</h3>
          
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-xs font-mono bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step !== 'idle' && step !== 'complete' && step !== 'error' ? (
              <div className="text-center p-4">
                <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-text-muted mt-2 animate-pulse">{renderStepHint()}</p>
              </div>
            ) : checkedInToday ? (
              <div className="bg-accent/10 border border-accent/25 rounded-2xl p-5 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-bg shadow shadow-accent/15">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-serif text-base font-bold text-accent">Checked in for today!</h4>
                <p className="text-xs font-mono text-text-muted leading-relaxed">
                  Your daily page has been logged and cryptographically hashed. You are safe for today. Return tomorrow to continue your streak!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {hasJournaledToday() ? (
                  <button
                    onClick={handleCheckIn}
                    className="w-full bg-accent hover:bg-accent-gold text-bg font-serif text-lg font-bold py-4 rounded-2xl transition shadow-lg shadow-accent/15 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Flame className="w-5 h-5 animate-pulse" />
                    Submit Today&apos;s Check-In (Gasless)
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-bg/40 border border-border rounded-2xl p-4 text-center">
                      <p className="text-xs font-mono text-text-muted leading-relaxed">
                        You haven&apos;t written any entries in your journal today. Write your daily morning page first, then return here to submit.
                      </p>
                    </div>
                    <Link
                      href="/app/journal"
                      className="w-full bg-surface border border-accent hover:bg-accent/5 text-accent font-serif text-base font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2"
                    >
                      Go to Journal Scribe
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Commitment Habit Grid */}
        <motion.div variants={itemVariants} className="bg-surface border border-border p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h3 className="text-sm font-mono uppercase tracking-widest text-text-muted">30-Day Progress Grid</h3>
            <span className="text-xs font-mono text-text-muted">
              {challenge.checkInCount} / {durationDays} check-ins
            </span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2.5 py-2">
            {Array.from({ length: durationDays }).map((_, i) => {
              const isPast = i < currentDayIndex;
              const isToday = i === currentDayIndex;
              const hasCheckedIn = checkedInDays[i] || false;

              let bgClass = 'bg-surface-2 border-border/60 text-text-muted/40';
              let borderClass = 'border';
              let badge = null;

              if (hasCheckedIn) {
                bgClass = 'bg-accent/15 border-accent/40 text-accent';
                badge = <Check className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 bg-accent text-bg rounded-full p-0.5 border border-surface" />;
              } else if (isToday && !checkedInToday) {
                bgClass = 'bg-bg/80 border-accent/40 text-accent animate-pulse';
                borderClass = 'border-2';
              } else if (isPast && !hasCheckedIn) {
                bgClass = 'bg-red-500/5 border-red-500/20 text-red-400/60';
              }

              return (
                <div key={i} className={`relative flex flex-col items-center justify-center aspect-square rounded-xl ${borderClass} ${bgClass} transition-all`}>
                  {badge}
                  <span className="text-[10px] font-mono font-bold">{i + 1}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 text-[10px] font-mono text-text-muted pt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-accent/20 border border-accent/40 rounded" />
              <span>Checked In</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-bg border-2 border-accent/40 rounded animate-pulse" />
              <span>Today (Pending)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-500/5 border border-red-500/20 rounded" />
              <span>Missed Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-surface-2 border border-border/60 rounded" />
              <span>Future Day</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Render completed view (claims)
  const renderClaim = () => {
    if (!challenge || !params) return null;

    const completed = challenge.checkInCount >= params.requiredCheckins;
    const stakeFormatted = (Number(params.stakeAmount) / 1e18).toFixed(2);
    const rewardFormatted = (Number(params.rewardAmount) / 1e18).toFixed(2);
    const totalPayout = completed
      ? (Number(params.stakeAmount + params.rewardAmount) / 1e18).toFixed(2)
      : stakeFormatted;

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={itemVariants} className="bg-surface border border-border p-8 rounded-[2.5rem] text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
          
          <div className="relative z-10 space-y-4 max-w-md mx-auto">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${
              completed ? 'bg-accent text-bg shadow-xl shadow-accent/15' : 'bg-surface-2 border border-border text-text-muted'
            }`}>
              {completed ? <CheckCircle2 className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
            </div>
            
            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-text-muted font-bold">Challenge Concluded</span>
            <h1 className="text-3xl font-serif tracking-tight">
              {completed ? 'Challenge Success!' : 'Challenge Concluded'}
            </h1>
            
            <p className="font-mono text-sm text-text-muted leading-relaxed">
              {completed
                ? `Incredible dedication! You completed ${challenge.checkInCount} check-ins and successfully finished the Morning Pages habit commitment. Claim your principal stake and yield rewards below.`
                : `You completed ${challenge.checkInCount} check-ins. Although you didn't reach the required ${params.requiredCheckins} streak, your capital remains completely safe. Claim your principal stake below.`
              }
            </p>
          </div>
        </motion.div>

        {/* Claim Info */}
        <motion.div variants={itemVariants} className="bg-surface-2 border border-border rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4 pb-5 border-b border-border/50">
            <div>
              <p className="text-[10px] font-mono uppercase text-text-muted">Original Stake</p>
              <p className="text-lg font-mono font-semibold text-text-primary mt-1">{stakeFormatted} USDm</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase text-text-muted">Yield Reward</p>
              <p className="text-lg font-mono font-semibold text-accent mt-1">
                {completed ? `+${rewardFormatted} USDm` : '0.00 USDm (missed streak)'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-serif text-base font-bold">Total Claimable Payout</span>
            <span className="font-mono text-2xl font-bold text-accent">{totalPayout} USDm</span>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-xs font-mono bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step !== 'idle' && step !== 'complete' && step !== 'error' ? (
              <div className="text-center p-4">
                <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-text-muted mt-2 animate-pulse">{renderStepHint()}</p>
              </div>
            ) : (
              <button
                onClick={withdraw}
                className="w-full bg-accent hover:bg-accent-gold text-bg font-serif text-lg font-bold py-4 rounded-2xl transition shadow-lg shadow-accent/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                Claim {totalPayout} USDm (Gasless)
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Render loading fallback
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-20 space-y-3">
      <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-mono text-text-muted animate-pulse">Synchronizing challenge status...</p>
    </div>
  );

  // Render view router
  const renderContent = () => {
    if (!address) {
      return (
        <div className="bg-surface border border-border p-8 rounded-3xl text-center space-y-4">
          <HelpCircle className="w-12 h-12 text-text-muted mx-auto" />
          <h2 className="font-serif text-xl font-semibold">Wallet Connection Required</h2>
          <p className="text-xs font-mono text-text-muted max-w-sm mx-auto leading-relaxed">
            Please connect your wallet at the top of the screen to join the habit staking commitment challenge.
          </p>
        </div>
      );
    }

    if (!isDeployed) {
      return (
        <div className="bg-surface border border-border p-8 rounded-3xl text-center space-y-6 max-w-xl mx-auto shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold">Staking Challenge Coming Soon</h2>
            <span className="inline-block text-[9px] font-mono uppercase bg-accent/25 border border-accent/40 text-accent px-2.5 py-0.5 rounded font-bold">
              Escrow Pending Deployment 🌐
            </span>
            <p className="text-xs font-mono text-text-muted leading-relaxed pt-2">
              The Lossless Morning Pages Staking Challenge (Phase 6) is configured in the application but the smart contract is not yet deployed on Celo Mainnet.
            </p>
            <p className="text-xs font-mono text-text-muted leading-relaxed">
              Once live, users will be able to lock 5.00 USDm, complete daily journal check-ins, and claim their stake back plus extra yields at conclusion.
            </p>
          </div>
          <div className="border-t border-border/40 pt-4">
            <Link
              href="/app"
              className="inline-flex bg-accent hover:bg-accent-gold text-bg font-serif text-sm font-bold px-6 py-2.5 rounded-xl transition"
            >
              Explore Other Tools
            </Link>
          </div>
        </div>
      );
    }

    if (!challenge) {
      return renderLoading();
    }

    // Router
    if (challenge.startTime === 0) {
      return renderRegister();
    }

    if (challenge.active) {
      return renderActive();
    }

    return renderClaim();
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Link href="/app" className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border hover:bg-surface transition">
          <ArrowLeft className="w-4 h-4 text-text-primary" />
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Streak Escrows</span>
      </div>

      {renderContent()}
    </div>
  );
}
