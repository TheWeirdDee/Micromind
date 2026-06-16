'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flame, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { updateStreak } from '@/lib/journal';

interface StreakData {
  streakCount: number;
  lastCheckInDate: string; // YYYY-MM-DD
  history: string[]; // List of YYYY-MM-DD
}

const SPARKS = [
  "Your focus is your most valuable asset. Stop renting it; invest it.",
  "Simplicity is the ultimate sophistication. Write code that whispers, don't scream.",
  "The best way to predict the future is to build it. One transaction at a time.",
  "Every prompt is a question; every response is an echo of humanity's collective knowledge.",
  "Decentralization is not just tech. It is the distribution of agency back to the edges.",
  "You do not need permission to innovate. Celo forno is hot, your wallet is ready, write your destiny.",
  "Consistency beats intensity. 1% better every day accumulates into exponential transformation.",
  "A developer is a writer whose words can move value across oceans in milliseconds.",
  "Do not seek followers. Seek peers who challenge your definitions of what is possible.",
  "The cost of thinking is high; make every prompt deliberate.",
  "Own your data. Own your logic. Own your value. That is the Web3 promise.",
  "MicroMind, macro impact. Pay only for what you build, think, and create.",
  "In a world of noise, clarity is a superpower. Focus on one problem and solve it deeply.",
  "Every line of code you write changes the state of the world slightly. Make it count."
];

export function DailyStreak() {
  const { address } = useWallet();
  const streakKey = address ? `micromind_streak_data_${address}` : 'micromind_streak_data';
  const sparkKey = address ? `micromind_today_spark_${address}` : 'micromind_today_spark';
  const [streak, setStreak] = useState<StreakData>({
    streakCount: 0,
    lastCheckInDate: '',
    history: []
  });
  const [isClaimedToday, setIsClaimedToday] = useState(false);
  const [showSpark, setShowSpark] = useState(false);
  const [sparkMessage, setSparkMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);

  const MILESTONES = [7, 14, 30];

  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const refreshStreak = useCallback(() => {
    // Recalculate streak dynamically first
    updateStreak(address);

    const stored = localStorage.getItem(streakKey);
    if (stored) {
      try {
        const data: StreakData = JSON.parse(stored);
        const today = getLocalDateString();
        const claimed = data.lastCheckInDate === today;
        
        setStreak(data);
        setIsClaimedToday(claimed);
        
        // If checked in today, retrieve today's quote from storage or pre-fill
        if (claimed) {
          const storedSpark = localStorage.getItem(sparkKey);
          if (storedSpark) {
            setSparkMessage(storedSpark);
            setShowSpark(true);
          } else {
            const randomIndex = Math.floor(Math.random() * SPARKS.length);
            const quote = SPARKS[randomIndex];
            localStorage.setItem(sparkKey, quote);
            setSparkMessage(quote);
            setShowSpark(true);
          }
        } else {
          setShowSpark(false);
        }
      } catch (e) {
        console.error('Failed to parse streak data', e);
      }
    } else {
      setStreak({
        streakCount: 0,
        lastCheckInDate: '',
        history: []
      });
      setIsClaimedToday(false);
      setShowSpark(false);
    }
  }, [address, streakKey, sparkKey]);

  // Load streak state from localStorage on mount and listen to updates
  useEffect(() => {
    refreshStreak();
    
    window.addEventListener('streak_updated', refreshStreak);
    window.addEventListener('journal_updated', refreshStreak);
    return () => {
      window.removeEventListener('streak_updated', refreshStreak);
      window.removeEventListener('journal_updated', refreshStreak);
    };
  }, [refreshStreak]);

  const handleCheckIn = useCallback(() => {
    setLoading(true);
    
    // Simulate brief AI generator delay
    setTimeout(() => {
      const today = getLocalDateString();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = getLocalDateString(yesterdayDate);

      let newStreakCount = streak.streakCount;
      let newHistory = [...streak.history];

      if (streak.lastCheckInDate === yesterday) {
        newStreakCount += 1;
      } else if (streak.lastCheckInDate !== today) {
        newStreakCount = 1;
        newHistory = []; // Reset history for broken streak
      }

      if (!newHistory.includes(today)) {
        newHistory.push(today);
      }

      const updatedStreak: StreakData = {
        streakCount: newStreakCount,
        lastCheckInDate: today,
        history: newHistory
      };

      // Select random quote
      const randomIndex = Math.floor(Math.random() * SPARKS.length);
      const quote = SPARKS[randomIndex];

      localStorage.setItem(streakKey, JSON.stringify(updatedStreak));
      localStorage.setItem(sparkKey, quote);

      setStreak(updatedStreak);
      setIsClaimedToday(true);
      setSparkMessage(quote);
      setShowSpark(true);
      setLoading(false);

      if (MILESTONES.includes(newStreakCount)) {
        setMilestone(newStreakCount);
        setTimeout(() => setMilestone(null), 4000);
      }
    }, 800);
  }, [streak, streakKey, sparkKey]);

  // Generate last 7 days of activity dots
  const renderCalendarDots = () => {
    const dots = [];
    const todayStr = getLocalDateString();

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateString(date);
      
      const isToday = dateStr === todayStr;
      const isChecked = streak.history.includes(dateStr);
      
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'narrow' });

      dots.push(
        <div key={dateStr} className="flex flex-col items-center gap-1.5">
          <div className="relative">
            {isToday && !isChecked ? (
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-5 h-5 rounded-full border border-accent-gold/60 flex items-center justify-center bg-accent-gold/5"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-accent-gold/40" />
              </motion.div>
            ) : (
              <div 
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isChecked 
                    ? 'bg-accent-gold text-bg' 
                    : 'bg-surface border border-border'
                }`}
              >
                {isChecked && <Flame className="w-3 h-3 text-bg fill-current" />}
              </div>
            )}
          </div>
          <span className="text-[9px] font-mono text-text-muted/60 uppercase">{dayLabel}</span>
        </div>
      );
    }
    return dots;
  };

  return (
    <div className="bg-surface border border-border p-5 rounded-2xl relative overflow-hidden group">
      <div className="absolute inset-0 halftone-bg opacity-10 pointer-events-none" />

      <AnimatePresence>
        {milestone && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className="absolute inset-x-3 top-3 z-20 flex items-center justify-center gap-2 rounded-xl bg-accent-gold text-bg py-2 px-4 font-mono text-xs font-bold shadow-lg shadow-accent-gold/30"
          >
            <Sparkles className="w-4 h-4" />
            <span>{milestone}-day streak! Keep it up.</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div>
          <h3 className="font-serif text-lg tracking-tight mb-1">Daily Mind Streak</h3>
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            Write in your journal or reflect daily to build your streak
          </p>
        </div>
        <Link
          href="/app/history?tab=journal"
          className="flex items-center gap-1.5 bg-accent-gold/10 border border-accent-gold/20 px-2.5 py-1 rounded-full text-accent-gold shrink-0 hover:bg-accent-gold/20 transition-colors"
        >
          <Flame className="w-4 h-4 fill-current" title="Current streak" />
          <span className="font-mono text-xs font-bold">{streak.streakCount}d</span>
        </Link>
      </div>

      <Link href="/app/history?tab=journal" className="block">
        <div className="flex justify-between items-center bg-surface-2 border border-border/60 rounded-xl px-4 py-3.5 mb-5 relative z-10 hover:border-accent/30 transition-colors">
          {renderCalendarDots()}
        </div>
      </Link>

      <div className="relative z-10">
        {!isClaimedToday ? (
          <button
            onClick={handleCheckIn}
            disabled={loading}
            className="pill-button w-full py-3 bg-accent text-bg hover:bg-white text-xs tracking-wider font-mono flex items-center justify-center gap-2 group-hover:scale-[1.01] transition-transform duration-200 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking in...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Check in for today</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 py-2.5 text-accent-green font-mono text-[10px] tracking-widest uppercase border border-accent-green/20 bg-accent-green/5 rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Streak active today</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSpark && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/60 pt-4 overflow-hidden relative z-10"
          >
            <p className="font-mono text-[9px] uppercase tracking-widest text-accent-gold/80 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" /> Today's Focus Spark
            </p>
            <p className="font-serif text-sm text-text-primary leading-relaxed italic bg-surface-2 p-3 rounded-xl border border-border/40">
              "{sparkMessage}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
