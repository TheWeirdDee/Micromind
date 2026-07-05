'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Brain, Sparkles, AlertTriangle, Loader2, CheckCircle2, Lock, HelpCircle, RefreshCw, Trophy, Calendar, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { useQuestProgress } from '@/hooks/useQuestProgress';
import { QUEST_LEVELS, QuestStage, QuestLevel } from '@/constants/levels';
import { getDailyHabitState } from '@/lib/journal';
import { getHistory } from '@/lib/storage';
import dynamic from 'next/dynamic';

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
  const { address, isConnected, isMiniPay } = useWallet();
  const { progress, loading: progressLoading, solveStage, resetProgress } = useQuestProgress(address);
  const { payViaRelay, payAndGenerate, loading: paidLoading, step: paidStep, error: paidError, reset: resetPayment } = usePayForPrompt();

  const [showWalletModal, setShowWalletModal] = useState(false);

  // Game UI state
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiCard, setAiCard] = useState<string | null>(null);

  // Collected Cards Gallery
  const [collectedCards, setCollectedCards] = useState<CollectedCard[]>([]);

  // Get active level config
  const activeLevel = QUEST_LEVELS.find(l => l.levelNumber === progress.currentLevel);
  const activeStage: QuestStage | undefined = activeLevel?.stages[progress.currentStage - 1];

  // Load collected cards on mount
  const cardsStorageKey = address ? `mm_quest_cards_${address}` : 'mm_quest_cards';
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(cardsStorageKey);
      if (stored) {
        try {
          setCollectedCards(JSON.parse(stored));
        } catch {}
      } else {
        setCollectedCards([]);
      }
    }
  }, [address, cardsStorageKey]);

  // Reset stage letters when level/stage changes
  useEffect(() => {
    setSelectedLetters([]);
    setIsSolved(false);
    setAiHint(null);
    setAiCard(null);
    resetPayment();
  }, [progress.currentLevel, progress.currentStage]);

  // Handle letter select
  const handleSelectLetter = (letter: string, index: number) => {
    if (isSolved || !activeStage) return;
    const targetLength = activeStage.targetWord.length;
    if (selectedLetters.length >= targetLength) return;

    const nextSelected = [...selectedLetters, letter];
    setSelectedLetters(nextSelected);

    // Verify solution
    if (nextSelected.join('') === activeStage.targetWord) {
      setIsSolved(true);
    }
  };

  // Remove last letter
  const handleRemoveLetter = (index: number) => {
    if (isSolved) return;
    const nextSelected = [...selectedLetters];
    nextSelected.splice(index, 1);
    setSelectedLetters(nextSelected);
  };

  // Clear slots
  const handleClearSlots = () => {
    if (isSolved) return;
    setSelectedLetters([]);
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

      // EIP-712 / direct prompt payment (maps to on-chain ID 1)
      let txHash: string | undefined;
      
      if (isMiniPay) {
        txHash = await payViaRelay(1, 'AI Hint', payload);
      } else {
        // Direct
        const res = await payAndGenerate(1, 'AI Hint', payload);
        // poll standard history
        const hist = getHistory();
        txHash = hist[0]?.txHash;
      }

      if (txHash) {
        // Fetch hint from backend
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
    } catch (e: any) {
      alert(`Payment or hint generation failed: ${e.message}`);
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

      let txHash: string | undefined;
      
      if (isMiniPay) {
        txHash = await payViaRelay(1, 'AI Reframe', payload);
      } else {
        await payAndGenerate(1, 'AI Reframe', payload);
        const hist = getHistory();
        txHash = hist[0]?.txHash;
      }

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

        // Save card to gallery
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
    } catch (e: any) {
      alert(`Card unlock failed: ${e.message}`);
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

  // Render Level Locking Navigation List
  const renderLevelsNav = () => {
    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-mono uppercase text-text-muted tracking-widest px-1">Clarity Levels</h4>
        <div className="space-y-1">
          {QUEST_LEVELS.map(level => {
            const isCompleted = progress.completedLevels.includes(level.levelNumber);
            const isCurrent = progress.currentLevel === level.levelNumber;
            const isLocked = level.levelNumber > progress.currentLevel;

            // Locked levels are hidden (EyeOff) as per spec instruction:
            // "level 2 which will be locked and not visible to users untill 1 is done completely"
            if (isLocked) {
              return (
                <div
                  key={level.levelNumber}
                  className="flex items-center gap-2.5 px-3 py-2 bg-surface-2/20 border border-border/30 rounded-xl opacity-20 pointer-events-none"
                >
                  <EyeOff className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs font-mono text-text-muted">Locked Scribe Path</span>
                </div>
              );
            }

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
    <div className="max-w-4xl mx-auto pb-24 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Link href="/app" className="p-2 border border-border rounded-xl hover:bg-surface-2 transition-colors">
            <ChevronLeft className="w-4 h-4 text-text-muted" />
          </Link>
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Gamified Scribe</p>
            <h1 className="text-3xl font-serif mt-1">Clarity Quest</h1>
          </div>
        </div>

        {/* Score metrics */}
        <div className="flex items-center gap-3 bg-surface-2 border border-border px-4 py-2 rounded-2xl">
          <div className="flex items-center gap-1.5 text-accent-gold">
            <Trophy className="w-4 h-4" />
            <span className="font-mono text-xs font-bold">{progress.clarityPoints} pts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Nav list (4cols) */}
        <aside className="lg:col-span-4 space-y-6">
          {renderLevelsNav()}
        </aside>

        {/* Quest canvas (8cols) */}
        <main className="lg:col-span-8 space-y-6">
          {activeStage ? (
            <div className="bg-surface border border-border p-6 rounded-2xl relative overflow-hidden space-y-6">
              <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />

              {/* Title & Stage indicators */}
              <div className="flex justify-between items-center relative z-10 border-b border-border/50 pb-3">
                <span className="text-xs font-mono text-accent uppercase tracking-wider">
                  {activeLevel?.category}
                </span>
                <span className="text-[10px] font-mono text-text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-lg">
                  Stage {progress.currentStage} of {activeLevel?.stages.length}
                </span>
              </div>

              {/* The Sentence with slots */}
              <div className="space-y-4 relative z-10">
                <h3 className="font-serif text-lg text-text-primary leading-relaxed text-center py-4">
                  {/* Split sentence by placeholder and render */}
                  {activeStage.sentence.split('{placeholder}')[0]}
                  <span className="inline-flex gap-1.5 mx-2 align-middle">
                    {Array.from({ length: activeStage.targetWord.length }).map((_, idx) => {
                      const letter = selectedLetters[idx];
                      return (
                        <motion.button
                          key={idx}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRemoveLetter(idx)}
                          className={`w-7 h-8 border rounded-lg font-mono text-sm font-bold flex items-center justify-center transition-all ${
                            letter
                              ? 'bg-accent/15 border-accent text-accent cursor-pointer shadow-sm'
                              : 'border-dashed border-border bg-surface-2/40 cursor-default'
                          }`}
                        >
                          {letter || ''}
                        </motion.button>
                      );
                    })}
                  </span>
                  {activeStage.sentence.split('{placeholder}')[1]}
                </h3>
              </div>

              {/* Actions & Scrambled Grid */}
              <div className="space-y-4 relative z-10">
                {/* Clear slots */}
                {selectedLetters.length > 0 && !isSolved && (
                  <button
                    onClick={handleClearSlots}
                    className="text-[9px] font-mono px-3 py-1 bg-surface-2 border border-border hover:border-red-400/30 hover:text-red-400 transition-colors rounded-lg block mx-auto"
                  >
                    Clear Slots
                  </button>
                )}

                {/* Scrambled buttons */}
                <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto pt-2">
                  {activeStage.scrambledLetters.map((l, i) => {
                    // Check if letter has already been selected up to its occurrence count
                    const selectedCount = selectedLetters.filter(x => x === l).length;
                    const totalCount = activeStage.scrambledLetters.filter(x => x === l).length;
                    const isUsed = selectedCount >= totalCount;

                    return (
                      <motion.button
                        key={i}
                        whileHover={{ scale: isUsed ? 1 : 1.1 }}
                        whileTap={{ scale: isUsed ? 1 : 0.95 }}
                        disabled={isUsed || isSolved}
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
                    "Clue: {aiHint}"
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

              {/* Solve success overlays */}
              <AnimatePresence>
                {isSolved && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t border-accent/40 pt-6 space-y-4 text-center relative z-10"
                  >
                    <div className="flex items-center gap-2 justify-center text-accent-gold font-bold text-sm font-mono">
                      <CheckCircle2 className="w-5 h-5 text-accent-gold fill-accent-gold/15" />
                      <span>Level Solved! (+10 Clarity Points)</span>
                    </div>

                    <p className="text-xs font-mono text-text-muted max-w-sm mx-auto leading-relaxed">
                      You mapped the flat sentence to the emotionally precise target: <strong>{activeStage.targetWord}</strong>.
                    </p>

                    {/* Paid Reframing Response */}
                    {aiCard && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 border border-accent-gold/40 bg-gradient-to-br from-accent-gold/10 to-surface rounded-[2rem] max-w-md mx-auto space-y-3 shadow-lg shadow-accent-gold/5"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-accent-gold" />
                          <span className="text-[10px] font-mono uppercase tracking-widest text-text-primary">Clarity Card Unlocked</span>
                        </div>
                        <p className="text-xs font-mono italic leading-relaxed text-text-primary">
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
                        onClick={solveStage}
                        className="pill-button border border-border hover:bg-surface-2 text-text-primary w-full py-3.5 text-xs font-mono"
                      >
                        Solve & Next Stage (Free)
                      </button>
                    </div>
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
                onClick={resetProgress}
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
                    className="bg-surface border border-border rounded-[2rem] p-5 space-y-3 shadow-md hover:border-accent-gold/30 hover:shadow-accent-gold/5 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-accent-gold/2 rounded-full filter blur-lg pointer-events-none" />
                    
                    <div className="flex justify-between items-center border-b border-border/30 pb-2">
                      <span className="text-[9px] font-mono text-accent-gold uppercase tracking-wider">{card.category}</span>
                      <span className="text-[9px] font-mono text-text-muted">{new Date(card.unlockedAt).toLocaleDateString()}</span>
                    </div>

                    <p className="text-[10px] font-mono text-text-muted leading-relaxed">
                      Context: "{card.sentence}"
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

      <ConnectWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </div>
  );
}
