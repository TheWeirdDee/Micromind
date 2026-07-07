'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Sparkles, AlertTriangle, Loader2, CheckCircle2, HelpCircle, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { useQuestProgress } from '@/hooks/useQuestProgress';
import { QUEST_LEVELS, QuestStage } from '@/constants/levels';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';

const ConnectWalletModal = dynamic(
  () => import('@/components/app/ConnectWalletModal').then((m) => m.ConnectWalletModal),
  { ssr: false }
);

interface CollectedCard {
  id: string; // stage id
  levelName: string;
  category: string;
  targetWord: string;
  sentence: string;
  cardText: string; // generated affirmation + question
  unlockedAt: number;
}

export default function QuestPage() {
  const { address, isConnected } = useWallet();
  const { progress, loading: progressLoading, dbWarning, solveStage, deductPoints, resetProgress } = useQuestProgress(address);
  const { payViaRelay, loading: paidLoading, step: paidStep, reset: resetPayment } = usePayForPrompt();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  // Game UI state
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiCard, setAiCard] = useState<string | null>(null);

  // Timer states
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes (120s)
  const [hasForfeited, setHasForfeited] = useState(false);

  // Withdrawal states
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [withdrawing, setWithdrawing] = useState(false);

  // Collected Cards Gallery
  const [collectedCards, setCollectedCards] = useState<CollectedCard[]>([]);

  // Get active level config
  const activeLevel = QUEST_LEVELS.find(l => l.levelNumber === progress.currentLevel);
  const activeStage: QuestStage | undefined = activeLevel?.stages[progress.currentStage - 1];

  const timerStorageKey = address
    ? `mm_quest_timer_${address}_lvl${progress.currentLevel}_stg${progress.currentStage}`
    : `mm_quest_timer_lvl${progress.currentLevel}_stg${progress.currentStage}`;

  // Load collected cards on mount
  const cardsStorageKey = address ? `mm_quest_cards_${address}` : 'mm_quest_cards';
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(cardsStorageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const t = setTimeout(() => setCollectedCards(parsed), 0);
          return () => clearTimeout(t);
        } catch {}
      } else {
        const t = setTimeout(() => setCollectedCards([]), 0);
        return () => clearTimeout(t);
      }
    }
  }, [address, cardsStorageKey]);

  // Set default withdrawal address when connected
  useEffect(() => {
    if (address) {
      const t = setTimeout(() => setWithdrawAddress(address), 0);
      return () => clearTimeout(t);
    }
  }, [address]);

  // Shuffle scrambled letters dynamically when stage changes
  useEffect(() => {
    if (activeStage) {
      const letters = [...activeStage.scrambledLetters];
      // Fisher-Yates shuffle
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      // If the shuffled letters still match the beginning of targetWord in order, reverse them
      if (letters.slice(0, activeStage.targetWord.length).join('') === activeStage.targetWord) {
        letters.reverse();
      }
      const t = setTimeout(() => setShuffledLetters(letters), 0);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setShuffledLetters([]), 0);
      return () => clearTimeout(t);
    }
  }, [activeStage]);

  // Reset stage letters and load/initialize timer when level/stage changes
  useEffect(() => {
    const t = setTimeout(() => {
      setSelectedIndices([]);
      setIsSolved(false);
      setIsFailed(false);
      setAiHint(null);
      setAiCard(null);
      resetPayment();

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(timerStorageKey);
        if (stored) {
          try {
            const { expiryTime, forfeited } = JSON.parse(stored);
            const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
            if (remaining <= 0) {
              setTimeLeft(0);
              setHasForfeited(true);
              setIsFailed(true);
            } else {
              setTimeLeft(remaining);
              setHasForfeited(forfeited);
              setIsFailed(false);
            }
          } catch {
            const newExpiry = Date.now() + 120 * 1000;
            setTimeLeft(120);
            setHasForfeited(false);
            localStorage.setItem(timerStorageKey, JSON.stringify({ expiryTime: newExpiry, forfeited: false }));
          }
        } else {
          const newExpiry = Date.now() + 120 * 1000;
          setTimeLeft(120);
          setHasForfeited(false);
          localStorage.setItem(timerStorageKey, JSON.stringify({ expiryTime: newExpiry, forfeited: false }));
        }
      }
    }, 0);
    return () => clearTimeout(t);
  }, [progress.currentLevel, progress.currentStage, timerStorageKey, resetPayment]);

  // Timer Countdown Effect
  useEffect(() => {
    if (progressLoading || isSolved || isFailed || !activeStage) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFailed(true);
          setHasForfeited(true); // Player loses point eligibility for this stage
          try {
            localStorage.setItem(timerStorageKey, JSON.stringify({ expiryTime: Date.now(), forfeited: true }));
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [progressLoading, isSolved, isFailed, activeStage, timerStorageKey]);

  // Handle letter select by index
  const handleSelectLetter = (letter: string, index: number) => {
    if (isSolved || isFailed || !activeStage) return;
    const targetLength = activeStage.targetWord.length;
    if (selectedIndices.length >= targetLength) return;

    const nextIndices = [...selectedIndices, index];
    setSelectedIndices(nextIndices);

    // Verify solution
    if (nextIndices.length === targetLength) {
      const spelledWord = nextIndices.map(idx => shuffledLetters[idx]).join('');
      if (spelledWord === activeStage.targetWord) {
        setIsSolved(true);
        setIsFailed(false);
        // Blast confetti!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      } else {
        setIsFailed(true);
        setIsSolved(false);
      }
    }
  };

  // Remove last letter
  const handleRemoveLetter = (index: number) => {
    if (isSolved) return;
    const nextIndices = [...selectedIndices];
    nextIndices.splice(index, 1);
    setSelectedIndices(nextIndices);
    setIsFailed(false);
  };

  // Clear slots / Retry Stage
  const handleClearSlots = () => {
    if (isSolved) return;
    setSelectedIndices([]);
    setIsFailed(false);

    if (timeLeft <= 0) {
      // Restart timer for retry, but keep forfeited = true
      const newExpiry = Date.now() + 120 * 1000;
      setTimeLeft(120);
      setHasForfeited(true);
      try {
        localStorage.setItem(timerStorageKey, JSON.stringify({ expiryTime: newExpiry, forfeited: true }));
      } catch {}
    }
  };

  // Solve stage wrapper
  const handleSolveStage = async () => {
    const pointsEarned = hasForfeited ? 0 : progress.currentLevel;
    try {
      localStorage.removeItem(timerStorageKey);
    } catch {}
    await solveStage(pointsEarned);
  };

  // Reset progress and clean all timer records
  const handleResetProgress = async () => {
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('mm_quest_timer_')) {
            localStorage.removeItem(key);
          }
        });
      } catch {}
    }
    await resetProgress();
  };

  // Handle Withdrawal to Real Money
  const handleWithdraw = async () => {
    if (withdrawAmount < 10) {
      alert('Minimum withdrawal is 10 Clarity Points');
      return;
    }
    if (progress.clarityPoints < withdrawAmount) {
      alert('Insufficient Clarity Points balance');
      return;
    }
    if (!withdrawAddress.startsWith('0x') || withdrawAddress.length !== 42) {
      alert('Please enter a valid Celo wallet address');
      return;
    }

    setWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in and sync your account to withdraw points to USDm.');
        setWithdrawing(false);
        return;
      }

      const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
      const res = await fetch(`${agentUrl}/api/quest/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userAddress: withdrawAddress,
          points: withdrawAmount
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      await deductPoints(withdrawAmount);
      setShowRewardsModal(false);
      alert(`Withdrawal Successful! Converted ${withdrawAmount} points to USDm.\nTransaction Hash: ${data.txHash}`);
    } catch (e: unknown) {
      const err = e as Error;
      alert(`Withdrawal Error: ${err.message}`);
    } finally {
      setWithdrawing(false);
    }
  };

  // Request Premium Hint (0.005 USDm)
  const handleGetHint = async () => {
    if (!activeStage || paidLoading) return;
    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    try {
      resetPayment();
      
      const payload = JSON.stringify({
        sentence: activeStage.sentence,
        targetWord: activeStage.targetWord,
        scrambledLetters: activeStage.scrambledLetters
      });

      // Always use EIP-712 gasless relay signature (no on-chain gas write transaction redirects)
      const txHash = await payViaRelay(1, 'AI Hint', payload);

      if (txHash) {
        const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
        const res = await fetch(`${agentUrl}/api/game/hint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence: activeStage.sentence,
            targetWord: activeStage.targetWord,
            scrambledLetters: activeStage.scrambledLetters,
            txHash
          })
        });

        if (!res.ok) throw new Error('Hint request failed');
        const data = await res.json();
        setAiHint(data.hintText);
      }
    } catch (e: unknown) {
      const err = e as Error;
      alert(`Payment or hint generation failed: ${err.message}`);
    }
  };

  // Unlock Premium Reframing Card (0.005 USDm)
  const handleUnlockCard = async () => {
    if (!activeStage || !activeLevel || paidLoading) return;
    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    try {
      resetPayment();
      
      const payload = JSON.stringify({
        sentence: activeStage.sentence,
        targetWord: activeStage.targetWord
      });

      // Always use EIP-712 gasless relay signature (no on-chain gas write transaction redirects)
      const txHash = await payViaRelay(1, 'AI Reframe', payload);

      if (txHash) {
        const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
        const res = await fetch(`${agentUrl}/api/game/reframe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence: activeStage.sentence,
            targetWord: activeStage.targetWord,
            txHash
          })
        });

        if (!res.ok) throw new Error('Reframing request failed');
        const data = await res.json();
        setAiCard(data.cardText);

        const newCard: CollectedCard = {
          id: activeStage.id,
          levelName: activeLevel.name,
          category: activeLevel.category,
          targetWord: activeStage.targetWord,
          sentence: activeStage.sentence.replace('{placeholder}', activeStage.targetWord),
          cardText: data.cardText,
          unlockedAt: Date.now()
        };

        const updated = [newCard, ...collectedCards];
        setCollectedCards(updated);
        localStorage.setItem(cardsStorageKey, JSON.stringify(updated));
      }
    } catch (e: unknown) {
      const err = e as Error;
      alert(`Card unlock failed: ${err.message}`);
    }
  };

  const getStepMessage = () => {
    switch (paidStep) {
      case 'checking':    return 'Verifying relayer...';
      case 'approving':   return 'Approving USDm...';
      case 'paying':      return 'Sending signature...';
      case 'confirming':  return 'Mining transaction...';
      case 'generating':  return 'AI is thinking...';
      default:            return 'Authorizing transaction...';
    }
  };

  // Render Rewards Hub (Withdrawal Section)
  const renderRewardsHub = (inModal = false) => {
    return (
      <div className={`bg-surface border border-border rounded-2xl p-5 sm:p-6 text-left ${inModal ? 'space-y-4 shadow-2xl' : 'space-y-5'}`}>
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🪙</span>
            <h4 className="font-serif text-lg text-text-primary">Clarity Rewards</h4>
          </div>
          <span className="text-xs font-mono text-accent bg-accent/10 px-2.5 py-0.5 rounded-lg font-bold">
            Rate: 10 pts = 0.005 USDm
          </span>
        </div>

        <p className="text-xs font-mono text-text-muted leading-relaxed">
          Redeem Clarity Points directly for USDm stablecoins, sent to your connected Celo address.
        </p>

        <div className="grid grid-cols-1 gap-4 pt-1">
          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase text-text-muted tracking-wider block">Connected Celo Wallet</label>
            <input
              type="text"
              placeholder="0x..."
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              className="w-full text-xs font-mono bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase text-text-muted tracking-wider block">Points to Redeem</label>
            <input
              type="number"
              placeholder="Min 10"
              step="10"
              min="10"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Math.max(10, parseInt(e.target.value) || 0))}
              className="w-full text-xs font-mono bg-surface-2 border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="text-xs font-mono text-text-muted text-center sm:text-left">
            Redeeming: <span className="font-bold text-accent-gold">{withdrawAmount} pts</span> ➔ <span className="font-bold text-accent">{(withdrawAmount * 0.0005).toFixed(4)} USDm</span>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={withdrawing || progress.clarityPoints < withdrawAmount}
            className="pill-button pill-button-primary px-6 py-3 text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed w-full flex items-center justify-center gap-1.5"
          >
            {withdrawing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing swap...</span>
              </>
            ) : (
              <>
                <span>Redeem USDm</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Render Level Locking Navigation List
  const renderLevelsNav = () => {
    // Only render levels <= progress.currentLevel
    const visibleLevels = QUEST_LEVELS.filter(l => l.levelNumber <= progress.currentLevel);

    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-mono uppercase text-text-muted tracking-widest px-1">Clarity Levels</h4>
        <div className="space-y-1">
          {visibleLevels.map(level => {
            const isCompleted = progress.completedLevels.includes(level.levelNumber);
            const isCurrent = progress.currentLevel === level.levelNumber;

            return (
              <div
                key={level.levelNumber}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all border ${
                  isCurrent
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface border-border text-text-muted'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-gold" />
                ) : (
                  <Trophy className="w-3.5 h-3.5 text-text-muted/60" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-serif font-bold leading-normal truncate">{level.name}</p>
                  <p className="text-[9px] font-mono text-text-muted/70 leading-normal truncate">{level.category}</p>
                </div>
                {isCurrent && (
                  <span className="text-[9px] font-mono bg-accent/20 text-accent px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                    Lvl {level.levelNumber}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (progressLoading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center animate-pulse space-y-3 font-mono text-xs uppercase tracking-widest text-accent">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading Quest Progress...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-8 px-4">
      {/* Supabase Schema Missing Warning */}
      {dbWarning && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-start gap-3 text-left">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-xs font-mono font-bold text-yellow-500 uppercase">Database Setup Required</h5>
            <p className="text-[11px] font-mono text-text-muted leading-relaxed">
              Quest progress is saving locally but failed to sync online because table <strong>quest_progress</strong> does not exist in Supabase. Please ask the administrator to execute the database schema file <code>docs/quest_progress.sql</code>.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Link href="/app" className="p-2 border border-border rounded-xl hover:bg-surface-2 transition-colors">
            <ChevronLeft className="w-4 h-4 text-text-muted" />
          </Link>
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Gamified Scribe</p>
            <h1 className="text-2xl sm:text-3xl font-serif mt-1">Clarity Quest</h1>
          </div>
        </div>

        {/* Score metrics & Reward mobile trigger */}
        <div className="flex items-center gap-2 bg-surface-2 border border-border px-3 sm:px-4 py-2 rounded-2xl">
          <div className="flex items-center gap-1.5 text-accent-gold">
            <Trophy className="w-4 h-4" />
            <span className="font-mono text-xs font-bold">{progress.clarityPoints} pts</span>
          </div>
          <button
            onClick={() => setShowRewardsModal(true)}
            className="text-[9px] font-mono bg-accent/25 hover:bg-accent/40 text-accent px-2 py-0.5 rounded-lg border border-accent/40 font-bold lg:hidden shadow-sm transition-all"
          >
            Reward
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Nav list (4cols) */}
        <aside className="lg:col-span-4 space-y-6">
          {renderLevelsNav()}
          <div className="hidden lg:block">
            {renderRewardsHub()}
          </div>
        </aside>

        {/* Quest canvas (8cols) */}
        <main className="lg:col-span-8 space-y-6">
          {activeStage ? (
            <div className="bg-surface border border-border p-5 sm:p-6 rounded-2xl relative overflow-hidden space-y-6">
              <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />

              {/* Title, Timer & Stage indicators */}
              <div className="flex justify-between items-center relative z-10 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
                    Lvl {progress.currentLevel} - Stage {progress.currentStage}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-bold ${
                    timeLeft < 30 
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                      : 'bg-surface-2 border-border text-text-muted'
                  }`}>
                    ⏳ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                  {hasForfeited && (
                    <span className="text-[9px] font-mono bg-red-950/40 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-md font-bold uppercase">
                      Forfeited Pts
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-lg">
                  {activeLevel?.category}
                </span>
              </div>

              {/* The Sentence with slots */}
              <div className="space-y-4 relative z-10 text-center">
                <p className="font-serif text-lg text-text-primary leading-relaxed px-2">
                  {activeStage.sentence.replace('{placeholder}', '__________')}
                </p>

                {/* Slots container (flex wrap for mobile) */}
                <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 py-4">
                  {Array.from({ length: activeStage.targetWord.length }).map((_, idx) => {
                    const selectedIdx = selectedIndices[idx];
                    const letter = selectedIdx !== undefined ? shuffledLetters[selectedIdx] : null;
                    return (
                      <motion.button
                        key={idx}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRemoveLetter(idx)}
                        className={`w-8 h-10 border rounded-xl font-mono text-base font-bold flex items-center justify-center transition-all ${
                          letter
                            ? 'bg-accent/15 border-accent text-accent cursor-pointer shadow-sm'
                            : 'border-dashed border-border bg-surface-2/40 cursor-default'
                        }`}
                      >
                        {letter || ''}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Actions & Scrambled Grid */}
              <div className="space-y-4 relative z-10">
                {/* Clear slots */}
                {selectedIndices.length > 0 && !isSolved && !isFailed && (
                  <button
                    onClick={handleClearSlots}
                    className="text-[9px] font-mono px-3 py-1 bg-surface-2 border border-border hover:border-red-400/30 hover:text-red-400 transition-colors rounded-lg block mx-auto"
                  >
                    Clear Slots
                  </button>
                )}

                {/* Scrambled buttons */}
                <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto pt-2">
                  {shuffledLetters.map((l, i) => {
                    const isUsed = selectedIndices.includes(i);

                    return (
                      <motion.button
                        key={i}
                        whileHover={{ scale: isUsed ? 1 : 1.1 }}
                        whileTap={{ scale: isUsed ? 1 : 0.95 }}
                        disabled={isUsed || isSolved || isFailed}
                        onClick={() => handleSelectLetter(l, i)}
                        className={`w-9 h-9 border rounded-xl font-mono text-sm font-bold flex items-center justify-center transition-all select-none ${
                          isUsed
                            ? 'opacity-20 cursor-not-allowed border-dashed bg-surface-2'
                            : 'border-border bg-surface-2 text-text-primary hover:border-accent/40 shadow-sm cursor-pointer'
                        }`}
                      >
                        {l}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Hints Box */}
              <div className="pt-2 border-t border-border/40 relative z-10 flex flex-col items-center space-y-3">
                {aiHint ? (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-accent-gold/5 border border-accent-gold/25 rounded-2xl w-full text-xs font-mono text-accent-gold text-center italic"
                  >
                    &quot;Clue: {aiHint}&quot;
                  </motion.div>
                ) : (
                  !isSolved && (
                    <button
                      onClick={handleGetHint}
                      disabled={paidLoading}
                      className="text-[10px] font-mono text-text-muted hover:text-accent flex items-center gap-1.5 py-1.5 px-3 border border-border rounded-xl bg-surface-2/40 hover:bg-surface-2 transition-all disabled:opacity-40"
                    >
                      {paidLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-accent" />
                          <span>{getStepMessage()}</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Unlock AI Clue Hint (0.005 USDm)</span>
                        </>
                      )}
                    </button>
                  )
                )}
              </div>

              {/* Solve success / fail overlays */}
              <AnimatePresence>
                {isSolved && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t border-accent/40 pt-6 space-y-4 text-center relative z-10"
                  >
                    <div className="flex items-center gap-2 justify-center text-accent-gold font-bold text-sm font-mono">
                      <CheckCircle2 className="w-5 h-5 text-accent-gold fill-accent-gold/15" />
                      <span>
                        {hasForfeited 
                          ? 'Level Solved! (0 points - timer expired)' 
                          : `Level Solved! (+${progress.currentLevel} Clarity Points)`
                        }
                      </span>
                    </div>

                    <p className="text-xs font-mono text-text-muted max-w-sm mx-auto leading-relaxed">
                      You mapped the flat thought to the emotionally precise target: <strong>{activeStage.targetWord}</strong>.
                    </p>

                    {/* Paid Reframing Response */}
                    {aiCard && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 border border-accent-gold/40 bg-gradient-to-br from-accent-gold/10 to-surface rounded-[2rem] max-w-md mx-auto space-y-3 shadow-lg shadow-accent-gold/5 text-left"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-accent-gold" />
                          <span className="text-[10px] font-mono uppercase tracking-widest text-text-primary">Clarity Card Unlocked</span>
                        </div>
                        <p className="text-xs font-mono italic leading-relaxed text-text-primary whitespace-pre-line">
                          {aiCard}
                        </p>
                      </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
                      {!aiCard && (
                        <button
                          onClick={handleUnlockCard}
                          disabled={paidLoading}
                          className="pill-button pill-button-primary w-full py-3.5 text-xs font-mono flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          {paidLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{getStepMessage()}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>AI Reframing Card (0.005 USDm)</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={handleSolveStage}
                        className="pill-button border border-border hover:bg-surface-2 text-text-primary w-full py-3.5 text-xs font-mono"
                      >
                        Solve & Next Stage (Free)
                      </button>
                    </div>
                  </motion.div>
                )}

                {isFailed && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t border-red-500/20 pt-6 space-y-4 text-center relative z-10"
                  >
                    <div className="flex items-center gap-2 justify-center text-red-400 font-bold text-sm font-mono">
                      <span>{timeLeft <= 0 ? "Time's Up! ⏰" : "Incorrect spelling 😢"}</span>
                    </div>

                    <p className="text-xs font-mono text-text-muted max-w-sm mx-auto leading-relaxed">
                      {timeLeft <= 0 
                        ? 'You ran out of time! You can retry to unlock progression, but you forfeit points for this stage.'
                        : `"${selectedIndices.map(idx => shuffledLetters[idx]).join('')}" is not the correct mindful word.`
                      }
                    </p>

                    <button
                      onClick={handleClearSlots}
                      className="pill-button bg-red-950/20 border border-red-500/30 hover:border-red-400 hover:text-red-400 w-full max-w-xs py-3 text-xs font-mono mx-auto block"
                    >
                      🔄 Retry Stage
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-surface border border-border p-8 rounded-2xl text-center space-y-3">
              <Trophy className="w-10 h-10 text-accent mx-auto animate-bounce" />
              <h3 className="font-serif text-2xl">Quest Mastered!</h3>
              <p className="text-xs font-mono text-text-muted max-w-md mx-auto leading-relaxed">
                Congratulations scribe! You have successfully completed all 10 Levels and cleared every puzzle on Clarity Quest. Your mental acuity is unlocked.
              </p>
              <button
                onClick={handleResetProgress}
                className="px-4 py-2 border border-border hover:bg-red-950/20 hover:text-red-400 hover:border-red-400/30 rounded-xl font-mono text-xs text-text-muted transition-colors"
              >
                Reset Progress (Start Over)
              </button>
            </div>
          )}

          {/* Cards Showcase */}
          {collectedCards.length > 0 && (
            <div className="space-y-4 border-t border-border/40 pt-6">
              <h3 className="font-serif text-lg px-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-gold" />
                <span>Your Clarity Card Collection</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collectedCards.map((card, i) => (
                  <motion.div
                    key={card.id + i}
                    layout
                    className="bg-surface border border-border rounded-[2rem] p-5 space-y-3 shadow-md hover:border-accent-gold/30 hover:shadow-accent-gold/5 transition-all relative overflow-hidden text-left"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-accent-gold/2 rounded-full filter blur-lg pointer-events-none" />
                    
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-[9px] font-mono text-accent-gold uppercase tracking-wider">{card.category}</span>
                      <span className="text-[9px] font-mono text-text-muted">{new Date(card.unlockedAt).toLocaleDateString()}</span>
                    </div>

                    <p className="text-[10px] font-mono text-text-muted leading-relaxed">
                      Context: &quot;{card.sentence}&quot;
                    </p>

                    <div className="pt-2 border-t border-border/20">
                      <p className="text-xs font-mono text-text-primary leading-relaxed italic whitespace-pre-line">
                        {card.cardText}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Rewards Hub Drawer/Modal on Mobile */}
      <AnimatePresence>
        {showRewardsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border p-6 rounded-3xl max-w-md w-full relative space-y-4"
            >
              <button
                onClick={() => setShowRewardsModal(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary font-bold font-mono text-sm px-2 py-1 rounded-lg bg-surface-2 border border-border hover:border-accent/40"
              >
                ✕ Close
              </button>
              <div className="pt-4">
                {renderRewardsHub(true)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConnectWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </div>
  );
}
