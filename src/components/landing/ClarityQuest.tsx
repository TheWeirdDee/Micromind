'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, ArrowRight, CheckCircle2, RotateCcw, Brain } from 'lucide-react';
import Link from 'next/link';

export function ClarityQuest() {
  const [typedLetters, setTypedLetters] = useState<string[]>([]);
  const [bankLetters, setBankLetters] = useState<{ id: string; letter: string; used: boolean }[]>([
    { id: '1', letter: 'A', used: false },
    { id: '2', letter: 'P', used: false },
    { id: '3', letter: 'P', used: false },
    { id: '4', letter: 'R', used: false },
    { id: '5', letter: 'E', used: false },
    { id: '6', letter: 'H', used: false },
    { id: '7', letter: 'E', used: false },
    { id: '8', letter: 'N', used: false },
    { id: '9', letter: 'S', used: false },
    { id: '10', letter: 'I', used: false },
    { id: '11', letter: 'V', used: false },
    { id: '12', letter: 'E', used: false },
  ]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const targetWord = 'APPREHENSIVE';

  useEffect(() => {
    if (!isPlaying) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index < targetWord.length) {
        const nextLetter = targetWord[index];
        setTypedLetters((prev) => [...prev, nextLetter]);
        setBankLetters((prev) => {
          const firstUnused = prev.find(item => item.letter === nextLetter && !item.used);
          if (firstUnused) {
            return prev.map(item => item.id === firstUnused.id ? { ...item, used: true } : item);
          }
          return prev;
        });
        index++;
      } else {
        clearInterval(interval);
        setIsCompleted(true);
        setIsPlaying(false);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleReset = () => {
    setTypedLetters([]);
    setBankLetters((prev) => prev.map(item => ({ ...item, used: false })));
    setIsCompleted(false);
    setIsPlaying(true);
  };

  return (
    <section className="py-24 md:py-32 px-6 bg-surface-2 border-t border-border relative overflow-hidden">
      <div className="absolute inset-0 halftone-bg opacity-3 pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-accent-gold/3 rounded-full filter blur-3xl pointer-events-none" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Copy Description Side */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-accent/10 border border-accent/20 rounded-lg text-accent">
                <Brain className="w-4 h-4" />
              </span>
              <span className="font-mono text-[10px] tracking-widest uppercase text-accent-gold">Cognitive Play</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-serif leading-tight text-text-primary">
              Learn the Precise Language of your Mind.
            </h2>
            
            <p className="font-mono text-[11px] leading-relaxed text-text-muted">
              Move beyond flat emotional descriptions. <strong>Clarity Quest</strong> challenges you to identify cognitive distortions and solve scrambled emotional vocabulary to build real granularity.
            </p>

            <ul className="space-y-3 font-mono text-[10px] text-text-muted">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span><strong>Identify Distortions:</strong> Spot filters, catastrophizing, and emotional reasoning in journal context.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span><strong>Unlock Clarity Cards:</strong> Earn custom CBT-guided affirmations and cognitive reframings.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span><strong>Claim Real Rewards:</strong> Earn Clarity Points that can be swapped directly for USDm stablecoins.</span>
              </li>
            </ul>

            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                href="/app/quest"
                className="pill-button pill-button-primary px-6 py-3 text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-accent/10"
              >
                <span>Play Clarity Quest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Interactive Simulation Side */}
          <div className="lg:col-span-7">
            <div className="bg-surface border border-border rounded-[2rem] p-6 sm:p-8 relative overflow-hidden shadow-xl space-y-6 text-left">
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                  <span className="font-mono text-[10px] uppercase text-text-muted tracking-wider">Quest Mode Live Demo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-accent-gold bg-accent-gold/10 border border-accent-gold/25 px-2 py-0.5 rounded-lg">
                    Level 2 - Stage 3
                  </span>
                </div>
              </div>

              {/* Clue and Distortion sentence */}
              <div className="space-y-3">
                <div className="bg-accent/5 border border-accent/15 rounded-xl p-3.5">
                  <span className="text-[8px] font-mono uppercase text-accent font-bold tracking-wider block mb-1">CBT Clue Insight</span>
                  <p className="text-[11px] font-mono text-text-primary">
                    "A specific, uneasy anticipation of future events, going beyond simple cognitive worry."
                  </p>
                </div>

                <p className="font-serif text-lg italic text-text-primary leading-relaxed text-center sm:text-left">
                  "Waiting for the test results left me feeling incredibly __________."
                </p>
              </div>

              {/* Slots Spelled Container */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2 py-2">
                {Array.from({ length: targetWord.length }).map((_, idx) => {
                  const letter = typedLetters[idx];
                  return (
                    <motion.div
                      key={idx}
                      className={`w-7 h-9 sm:w-8 sm:h-10 border rounded-xl font-mono text-sm sm:text-base font-bold flex items-center justify-center transition-all ${
                        letter
                          ? 'bg-accent/15 border-accent text-accent shadow-sm'
                          : 'border-dashed border-border bg-surface-2/40'
                      }`}
                    >
                      {letter || ''}
                    </motion.div>
                  );
                })}
              </div>

              {/* Bank Scrambled Grid */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2 max-w-md">
                {bankLetters.map((item) => (
                  <div
                    key={item.id}
                    className={`w-7 h-7 sm:w-8 sm:h-8 border rounded-lg font-mono text-xs font-bold flex items-center justify-center select-none transition-all ${
                      item.used
                        ? 'opacity-15 border-dashed bg-surface-2'
                        : 'border-border bg-surface-2 text-text-primary shadow-sm'
                    }`}
                  >
                    {item.letter}
                  </div>
                ))}
              </div>

              {/* Solved Overlay Card */}
              <AnimatePresence>
                {isCompleted && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border-t border-border/50 pt-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-accent-gold font-bold text-xs font-mono">
                        <Trophy className="w-4 h-4" />
                        <span>Stage Solved! (+2 Clarity Points)</span>
                      </div>
                      <button
                        onClick={handleReset}
                        className="text-[9px] font-mono text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Replay</span>
                      </button>
                    </div>

                    {/* Comparison Card */}
                    <div className="border border-accent-gold/25 bg-accent-gold/5 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-1 text-accent-gold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <h4 className="text-[9px] font-mono uppercase tracking-wider font-bold">Say Precisely</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs leading-relaxed font-mono">
                        <div className="sm:col-span-4 bg-surface border border-border p-2 rounded-lg">
                          <span className="text-[8px] text-red-400 block uppercase font-bold mb-0.5">Instead of</span>
                          <span className="line-through text-text-muted text-[10px]">Scared / Anxious</span>
                        </div>
                        <div className="sm:col-span-8 bg-surface border border-border p-2 rounded-lg text-text-primary">
                          <span className="text-[8px] text-accent block uppercase font-bold mb-0.5">Say precisely</span>
                          <span className="text-[10px]">Apprehensive: Highlights specific uneasy anticipation of future events.</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
