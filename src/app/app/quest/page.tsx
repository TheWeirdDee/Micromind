'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Trophy,
  BookOpen,
  Search,
  Lock,
  Play,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { useQuestProgress } from '@/hooks/useQuestProgress';
import { QUEST_LEVELS, QuestStage, QuestLevel } from '@/constants/levels';
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

interface VocabularyEntry {
  id: string;
  levelName: string;
  category: string;
  targetWord: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  unlockedAt: number;
}

// Helper to provide emotional granularity comparisons
function getEmotionalGranularityComparison(word: string): { generic: string; nuance: string } {
  const comparisons: Record<string, { generic: string; nuance: string }> = {
    'REJUVENATING': {
      generic: 'Good / Rested',
      nuance: 'Rejuvenating means you are actively restored with new energy and vitality, rather than just feeling passive rest.'
    },
    'APPRECIATIVE': {
      generic: 'Grateful / Happy',
      nuance: 'Appreciative emphasizes actively recognizing and valuing the specific kindness, support, or positive details of a moment.'
    },
    'NOURISHING': {
      generic: 'Nice / Good',
      nuance: 'Nourishing describes experiences or relationships that feed your soul and rebuild your emotional resources, not just pleasant moments.'
    },
    'DISORIENTED': {
      generic: 'Confused',
      nuance: 'Disoriented captures a deeper loss of direction, context, or stability in a situation, going beyond simple cognitive confusion.'
    },
    'NOSTALGIC': {
      generic: 'Sad / Thinking',
      nuance: 'Nostalgic specifically names a bittersweet, sentimental longing for the past, combining affection with a soft touch of sadness.'
    },
    'VALIDATED': {
      generic: 'Happy / Heard',
      nuance: 'Validated means your inner state is recognized as worthy and reasonable, reinforcing self-trust and reducing self-doubt.'
    },
    'APPREHENSIVE': {
      generic: 'Scared / Anxious',
      nuance: 'Apprehensive highlights a specific, uneasy anticipation of future events, rather than a general or objectless sense of anxiety.'
    },
    'REASSURED': {
      generic: 'Fine / Safe',
      nuance: 'Reassured indicates a positive shift from fear or doubt back to confidence, usually sparked by a specific comfort or confirmation.'
    },
    'ASSERTIVE': {
      generic: 'Bold / Angry',
      nuance: 'Assertive is expressing your needs clearly and respectfully, finding the healthy balance between passivity and aggression.'
    },
    'DIPLOMATIC': {
      generic: 'Polite / Quiet',
      nuance: 'Diplomatic means navigating conflict tactfully to preserve relationships, whereas polite is just standard social manners.'
    },
    'COLLABORATIVE': {
      generic: 'Together',
      nuance: 'Collaborative represents a unified, synergistic flow where ideas merge, rather than just working side-by-side.'
    },
    'COMPOSED': {
      generic: 'Quiet / OK',
      nuance: 'Composed is actively holding self-control and calmness under pressure, not just the absence of external stress.'
    },
    'CONSTRUCTIVE': {
      generic: 'Good / Helpful',
      nuance: 'Constructive feedback is designed to actively build up skills and offer positive forward steps, rather than just pointing out flaws.'
    },
    'TRANSPARENT': {
      generic: 'Honest',
      nuance: 'Transparent is proactively exposing processes and information so there is nothing hidden, going beyond simply not lying.'
    },
    'PRAGMATIC': {
      generic: 'Practical',
      nuance: 'Pragmatic focuses on what realistically works in practice, choosing sensible compromises over perfection or pure theory.'
    }
  };

  const wordUpper = word.toUpperCase();
  if (comparisons[wordUpper]) {
    return comparisons[wordUpper];
  }

  return {
    generic: 'Good / Fine',
    nuance: `Using "${word}" gives your writing and reflection specific emotional detail, helping you identify the exact nature of this state.`
  };
}

interface QuestVocabularyRow {
  stage_id: string;
  level_name: string;
  category: string;
  target_word: string;
  definition: string;
  examples?: string[];
  synonyms?: string[];
  unlocked_at: string;
}

function shuffleLetters(scrambledLetters: string[], targetWord: string): string[] {
  const letters = [...scrambledLetters];
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.slice(0, targetWord.length).join('') === targetWord) {
    letters.reverse();
  }
  return letters;
}

function getCurrentTimestamp(): number {
  return Date.now();
}

export default function QuestPage() {
  const { address, isConnected } = useWallet();
  const { progress, loading: progressLoading, dbWarning, solveStage, deductPoints, resetProgress } = useQuestProgress(address);
  const { payViaRelay, loading: paidLoading, step: paidStep, reset: resetPayment } = usePayForPrompt();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  // Tab state in sidebar
  const [sidebarTab, setSidebarTab] = useState<'levels' | 'dictionary' | 'cards'>('levels');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Game UI state
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiCard, setAiCard] = useState<string | null>(null);
  const [selectedVocabWord, setSelectedVocabWord] = useState<{ word: string; meaning: string } | null>(null);
  const [shuffleCount, setShuffleCount] = useState(0);

  // Timer states
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes (120s)
  const [hasForfeited, setHasForfeited] = useState(false);

  // Withdrawal states
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [withdrawing, setWithdrawing] = useState(false);
 
  // Custom dialog/modal states
  const [successModal, setSuccessModal] = useState<{
    title: string;
    message: string;
    txHash?: string;
  } | null>(null);
  const [errorModal, setErrorModal] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Collected Cards Gallery
  const [collectedCards, setCollectedCards] = useState<CollectedCard[]>([]);
  const [vocabularyEntries, setVocabularyEntries] = useState<VocabularyEntry[]>([]);
  const [pendingDictionaryEntry, setPendingDictionaryEntry] = useState<VocabularyEntry | null>(null);
  const [addingToDictWord, setAddingToDictWord] = useState<string | null>(null);

  // Review states
  const [reviewLevelNumber, setReviewLevelNumber] = useState<number | null>(null);
  const [reviewStageIndex, setReviewStageIndex] = useState<number | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);

  // Dictionary Search and Filters
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabFilterCategory, setVocabFilterCategory] = useState('All');

  // Accordion state for Categories nav
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Database warning states
  const [vocabDbWarning, setVocabDbWarning] = useState(false);

  // Get active level config for either live quest or review mode
  const activeLevel = QUEST_LEVELS.find(l => l.levelNumber === (reviewLevelNumber ?? progress.currentLevel));
  const activeStageIndex = reviewStageIndex ?? (activeLevel?.levelNumber === progress.currentLevel ? progress.currentStage - 1 : 0);
  const activeStage: QuestStage | undefined = activeLevel?.stages[activeStageIndex];

  const isReviewing = reviewLevelNumber !== null;
  const displayLevelNumber = reviewLevelNumber ?? progress.currentLevel;
  const displayStageNumber = activeStageIndex + 1;

  const timerStorageKey = address
    ? `mm_quest_timer_${address}_lvl${displayLevelNumber}_stg${displayStageNumber}`
    : `mm_quest_timer_lvl${displayLevelNumber}_stg${displayStageNumber}`;

  // Load collected cards on mount
  const cardsStorageKey = useMemo(() => address ? `mm_quest_cards_${address}` : 'mm_quest_cards', [address]);
  const vocabStorageKey = useMemo(() => address ? `mm_quest_vocabulary_${address}` : 'mm_quest_vocabulary', [address]);

  // Set default expanded category to active level's category if not set by user
  const currentCategory = expandedCategory ?? activeLevel?.category ?? '';

  const toggleCategory = (catName: string) => {
    if (currentCategory === catName) {
      setExpandedCategory('');
    } else {
      setExpandedCategory(catName);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 0);
    return () => clearTimeout(timer);
  }, [cardsStorageKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(vocabStorageKey);
        if (stored) {
          try {
            setVocabularyEntries(JSON.parse(stored));
          } catch {}
        } else {
          setVocabularyEntries([]);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [vocabStorageKey]);

  const saveVocabularyEntries = useCallback((entries: VocabularyEntry[]) => {
    setVocabularyEntries(entries);
    if (typeof window !== 'undefined') {
      localStorage.setItem(vocabStorageKey, JSON.stringify(entries));
    }
  }, [vocabStorageKey]);

  const createDictionaryEntry = useCallback((stage: QuestStage, level: QuestLevel): VocabularyEntry => ({
    id: stage.id,
    levelName: level.name,
    category: level.category,
    targetWord: stage.targetWord,
    definition: stage.vocabulary?.definition ?? stage.clue,
    examples: stage.vocabulary?.examples && stage.vocabulary.examples.length > 0
      ? stage.vocabulary.examples 
      : [stage.sentence.replace('{placeholder}', stage.targetWord)],
    synonyms: stage.vocabulary?.synonyms ?? [],
    unlockedAt: getCurrentTimestamp(),
  }), []);

  const syncVocabularyEntryToSupabase = async (entry: VocabularyEntry, userId: string) => {
    try {
      const { error } = await supabase.from('quest_vocabulary').upsert(
        {
          user_id: userId,
          stage_id: entry.id,
          level_name: entry.levelName,
          category: entry.category,
          target_word: entry.targetWord,
          definition: entry.definition,
          examples: entry.examples,
          synonyms: entry.synonyms,
          unlocked_at: new Date(entry.unlockedAt).toISOString(),
        },
        { onConflict: 'user_id,stage_id' }
      );
      if (error) throw error;
      setVocabDbWarning(false);
    } catch (err) {
      const errorVal = err as { code?: string; message?: string };
      console.warn('[SYNC VOCABULARY ERROR]', errorVal);
      if (errorVal && (errorVal.code === 'PGRST205' || errorVal.message?.includes('relation "quest_vocabulary" does not exist') || errorVal.message?.includes('does not exist'))) {
        setVocabDbWarning(true);
      }
    }
  };

  const loadVocabularyEntriesFromSupabase = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) return;

      const { data, error } = await supabase
        .from('quest_vocabulary')
        .select('*')
        .eq('user_id', session.user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      if (!data) return;

      const remoteEntries = data.map((row: QuestVocabularyRow) => ({
        id: row.stage_id,
        levelName: row.level_name,
        category: row.category,
        targetWord: row.target_word,
        definition: row.definition,
        examples: row.examples ?? [],
        synonyms: row.synonyms ?? [],
        unlockedAt: new Date(row.unlocked_at).getTime(),
      }));

      const localString = typeof window !== 'undefined' ? localStorage.getItem(vocabStorageKey) : null;
      const localEntries: VocabularyEntry[] = localString ? JSON.parse(localString) : [];
      const remoteIds = new Set(remoteEntries.map((entry) => entry.id));
      const merged = [...remoteEntries, ...localEntries.filter((item) => !remoteIds.has(item.id))];
      
      setVocabularyEntries(merged);
      if (typeof window !== 'undefined') {
        localStorage.setItem(vocabStorageKey, JSON.stringify(merged));
      }
      setVocabDbWarning(false);
    } catch (err) {
      const errorVal = err as { code?: string; message?: string };
      console.warn('[LOAD VOCABULARY ERROR]', errorVal);
      if (errorVal && (errorVal.code === 'PGRST205' || errorVal.message?.includes('relation "quest_vocabulary" does not exist') || errorVal.message?.includes('does not exist'))) {
        setVocabDbWarning(true);
      }
    }
  }, [vocabStorageKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadVocabularyEntriesFromSupabase();
    }, 0);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setTimeout(() => {
          loadVocabularyEntriesFromSupabase();
        }, 0);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [loadVocabularyEntriesFromSupabase]);

  // Set default withdrawal address when connected
  useEffect(() => {
    if (address) {
      const timer = setTimeout(() => {
        setWithdrawAddress(address);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [address]);

  // Shuffle scrambled letters dynamically when stage changes
  useEffect(() => {
    if (activeStage) {
      const letters = shuffleLetters(activeStage.scrambledLetters, activeStage.targetWord);
      const timer = setTimeout(() => {
        setShuffledLetters(letters);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShuffledLetters([]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeStage]);

  // Reset stage letters and load/initialize timer when level/stage changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIndices([]);
      setIsSolved(false);
      setIsFailed(false);
      setAiHint(null);
      setAiCard(null);
      setSelectedVocabWord(null);
      setPendingDictionaryEntry(null);
      setIsReplaying(false);
      setShuffleCount(0);

      if (isReviewing) {
        setTimeLeft(120);
        setHasForfeited(false);
        return;
      }

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(timerStorageKey);
        if (stored) {
          try {
            const { expiryTime, forfeited } = JSON.parse(stored);
            const remaining = Math.max(0, Math.floor((expiryTime - getCurrentTimestamp()) / 1000));
            if (remaining <= 0 || forfeited) {
              setTimeLeft(0);
              setHasForfeited(true);
              setIsFailed(false); // DO NOT lock the user out from playing!
            } else {
              setTimeLeft(remaining);
              setHasForfeited(forfeited);
              setIsFailed(false);
            }
          } catch {
            const newExpiry = getCurrentTimestamp() + 120 * 1000;
            setTimeLeft(120);
            setHasForfeited(false);
            localStorage.setItem(timerStorageKey, JSON.stringify({ expiryTime: newExpiry, forfeited: false }));
          }
        } else {
          const newExpiry = getCurrentTimestamp() + 120 * 1000;
          setTimeLeft(120);
          setHasForfeited(false);
          localStorage.setItem(timerStorageKey, JSON.stringify({ expiryTime: newExpiry, forfeited: false }));
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [progress.currentLevel, progress.currentStage, timerStorageKey, isReviewing]);

  // Timer Countdown Effect
  useEffect(() => {
    // If they have already forfeited, do NOT run the countdown timer at all!
    if (progressLoading || isSolved || isFailed || !activeStage || isReviewing || hasForfeited) return;
 
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFailed(false); // DO NOT lock the user out from playing!
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
  }, [progressLoading, isSolved, isFailed, activeStage, timerStorageKey, isReviewing, hasForfeited]);

  // Handle letter select by index
  const handleSelectLetter = (letter: string, index: number) => {
    if (isSolved || isFailed || !activeStage || !activeLevel) return;
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

        // Set pending dictionary entry
        const entry = createDictionaryEntry(activeStage, activeLevel);
        setPendingDictionaryEntry(entry);
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
  };

  // Handle manual shuffle of letters (max 3 times per stage)
  const handleShuffleLetters = () => {
    if (shuffleCount >= 3) return;

    // Find all indices that are NOT selected (i.e. currently in the word bank)
    const unselectedIndices = shuffledLetters
      .map((_, idx) => idx)
      .filter(idx => !selectedIndices.includes(idx));

    if (unselectedIndices.length <= 1) return; // Nothing to shuffle

    // Copy the letters array
    const letters = [...shuffledLetters];
    
    // Copy the values of the unselected letters
    const unselectedValues = unselectedIndices.map(idx => letters[idx]);
    
    // Shuffle the unselected values array (Fisher-Yates)
    for (let i = unselectedValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unselectedValues[i], unselectedValues[j]] = [unselectedValues[j], unselectedValues[i]];
    }

    // Put the shuffled values back into their respective positions in the letters array
    unselectedIndices.forEach((origIdx, shuffleIdx) => {
      letters[origIdx] = unselectedValues[shuffleIdx];
    });

    setShuffledLetters(letters);
    setShuffleCount(prev => prev + 1);
  };

  // Handle Explicit Add to Dictionary
  const handleAddToDictionary = async () => {
    if (!pendingDictionaryEntry) return;
    const targetWord = pendingDictionaryEntry.targetWord;
    setAddingToDictWord(targetWord);

    // Keep unique entries by targetWord
    const nextEntries = [pendingDictionaryEntry, ...vocabularyEntries.filter((item) => item.targetWord !== targetWord)];
    saveVocabularyEntries(nextEntries);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await syncVocabularyEntryToSupabase(pendingDictionaryEntry, session.user.id);
      }
    } catch (err) {
      console.warn('[ADD TO DICTIONARY ERROR]', err);
    }

    // Success animation timeout
    setTimeout(() => {
      setAddingToDictWord(null);
      setPendingDictionaryEntry(null);
    }, 1200);
  };

  // Review sequential navigation
  const handlePrevReviewStage = useCallback(() => {
    if (reviewLevelNumber === null || reviewStageIndex === null) return;
    if (reviewStageIndex > 0) {
      setReviewStageIndex(reviewStageIndex - 1);
    } else {
      const prevLvl = reviewLevelNumber - 1;
      const prevLvlConfig = QUEST_LEVELS.find(l => l.levelNumber === prevLvl);
      if (prevLvlConfig && (progress.completedLevels.includes(prevLvl) || progress.currentLevel === prevLvl)) {
        setReviewLevelNumber(prevLvl);
        setReviewStageIndex(prevLvlConfig.stages.length - 1);
      }
    }
  }, [reviewLevelNumber, reviewStageIndex, progress.completedLevels, progress.currentLevel]);

  const handleNextReviewStage = useCallback(() => {
    if (reviewLevelNumber === null || reviewStageIndex === null) return;
    const currentLvlConfig = QUEST_LEVELS.find(l => l.levelNumber === reviewLevelNumber);
    if (!currentLvlConfig) return;

    if (reviewStageIndex < currentLvlConfig.stages.length - 1) {
      setReviewStageIndex(reviewStageIndex + 1);
    } else {
      const nextLvl = reviewLevelNumber + 1;
      const nextLvlConfig = QUEST_LEVELS.find(l => l.levelNumber === nextLvl);
      const isNextLvlUnlocked = progress.completedLevels.includes(reviewLevelNumber) && nextLvl <= progress.currentLevel;
      if (nextLvlConfig && isNextLvlUnlocked) {
        setReviewLevelNumber(nextLvl);
        setReviewStageIndex(0);
      } else {
        setErrorModal({ title: 'End of Review', message: 'You have reached the end of your unlocked review content!' });
      }
    }
  }, [reviewLevelNumber, reviewStageIndex, progress.completedLevels, progress.currentLevel]);

  const handleSolveStage = async () => {
    if (isReviewing) {
      if (isReplaying) {
        setIsReplaying(false);
      } else {
        handleNextReviewStage();
      }
      return;
    }

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
    setReviewLevelNumber(null);
    setReviewStageIndex(null);
    setIsReplaying(false);
  };

  // Handle Withdrawal to Real Money
  const handleWithdraw = async () => {
    if (withdrawAmount < 10) {
      setErrorModal({ title: 'Validation Error', message: 'Minimum withdrawal is 10 Clarity Points.' });
      return;
    }
    if (progress.clarityPoints < withdrawAmount) {
      setErrorModal({ title: 'Insufficient Balance', message: 'You do not have enough Clarity Points to withdraw.' });
      return;
    }
    if (!withdrawAddress.startsWith('0x') || withdrawAddress.length !== 42) {
      setErrorModal({ title: 'Invalid Wallet Address', message: 'Please enter a valid 42-character Celo wallet address starting with 0x.' });
      return;
    }
 
    setWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorModal({ title: 'Authentication Required', message: 'Please log in and sync your account to withdraw points to USDm.' });
        setWithdrawing(false);
        return;
      }
 
      // Force sync progress to Supabase before calling withdraw
      const { error: syncError } = await supabase.from('quest_progress').upsert({
        user_id: session.user.id,
        current_level: progress.currentLevel,
        current_stage: progress.currentStage,
        completed_levels: progress.completedLevels,
        clarity_points: progress.clarityPoints,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
 
      if (syncError) {
        console.error('[WITHDRAW SYNC ERROR]', syncError);
        setErrorModal({ title: 'Database Sync Failed', message: `Failed to sync progress to database: ${syncError.message} (Code: ${syncError.code})` });
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
      
      // Trigger Confetti!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      
      setSuccessModal({
        title: 'Swap Complete! 🎉',
        message: `Successfully converted ${withdrawAmount} Clarity Points to ${(withdrawAmount * 0.0005).toFixed(4)} USDm.`,
        txHash: data.txHash
      });
    } catch (e: unknown) {
      const err = e as Error;
      setErrorModal({ title: 'Withdrawal Failed', message: err.message });
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
      setErrorModal({ title: 'Hint Request Failed', message: err.message });
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
          unlockedAt: getCurrentTimestamp()
        };
 
        const updated = [newCard, ...collectedCards];
        setCollectedCards(updated);
        localStorage.setItem(cardsStorageKey, JSON.stringify(updated));
      }
    } catch (e: unknown) {
      const err = e as Error;
      setErrorModal({ title: 'Card Unlock Failed', message: err.message });
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

  // Filtered dictionary list
  const filteredVocabulary = useMemo(() => {
    return vocabularyEntries.filter((entry) => {
      const matchesSearch = entry.targetWord.toLowerCase().includes(vocabSearch.toLowerCase()) || 
                            entry.definition.toLowerCase().includes(vocabSearch.toLowerCase());
      const matchesCategory = vocabFilterCategory === 'All' || entry.category === vocabFilterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [vocabularyEntries, vocabSearch, vocabFilterCategory]);

  // Extract unique categories in vocabulary for filtering
  const dictionaryCategories = useMemo(() => {
    const categories = new Set<string>();
    vocabularyEntries.forEach(entry => {
      if (entry.category) categories.add(entry.category);
    });
    return Array.from(categories);
  }, [vocabularyEntries]);

  // Render Rewards Hub
  const renderRewardsHub = (inModal = false) => {
    return (
      <div className={`bg-surface border border-border rounded-2xl p-5 sm:p-6 text-left ${inModal ? 'space-y-4 shadow-2xl' : 'space-y-5'}`}>
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🪙</span>
            <h4 className="font-serif text-lg text-text-primary">Clarity Rewards</h4>
          </div>
          <span className="text-xs font-mono text-accent bg-accent/10 px-2.5 py-0.5 rounded-lg font-bold">
            10 pts = 0.005 USDm
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

  // Render Category-driven navigation Accordion
  const renderCategoryNav = () => {
    const grouped = QUEST_LEVELS.reduce((map, level) => {
      if (!map[level.category]) map[level.category] = [];
      map[level.category].push(level);
      return map;
    }, {} as Record<string, typeof QUEST_LEVELS>);

    return (
      <div className="space-y-4">
        <div className="px-1 text-left">
          <h4 className="text-[10px] font-mono uppercase text-text-muted tracking-widest">Category Modules</h4>
          <p className="text-[11px] text-text-muted">Explore emotional categories and review solved stages.</p>
        </div>

        <div className="space-y-2 text-left">
          {Object.entries(grouped).map(([catName, levels]) => {
            const isExpanded = currentCategory === catName;
            
            let completedStagesCount = 0;
            let hasUnlockedLevel = false;

            levels.forEach(lvl => {
              if (lvl.levelNumber <= progress.currentLevel) {
                hasUnlockedLevel = true;
                if (lvl.levelNumber < progress.currentLevel) {
                  completedStagesCount += lvl.stages.length;
                } else {
                  completedStagesCount += Math.min(lvl.stages.length, progress.currentStage - 1);
                }
              }
            });

            return (
              <div
                key={catName}
                className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface'
                }`}
              >
                <button
                  onClick={() => toggleCategory(catName)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-2/50 transition-colors"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <p className="text-xs font-serif font-bold text-text-primary truncate">{catName}</p>
                    <p className="text-[9px] font-mono text-text-muted">
                      {completedStagesCount > 0 
                        ? `${completedStagesCount} Stage${completedStagesCount > 1 ? 's' : ''} Solved` 
                        : 'No Stages Solved'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!hasUnlockedLevel && <Lock className="w-3.5 h-3.5 text-text-muted/65" />}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-border/30 bg-surface-2/20"
                    >
                      <div className="p-3.5 space-y-3">
                        {levels.map((lvl) => {
                          const isLevelUnlocked = lvl.levelNumber <= progress.currentLevel;

                          return (
                            <div key={lvl.levelNumber} className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-mono text-text-muted font-semibold">
                                <span className="uppercase tracking-wider">Lvl {lvl.levelNumber}: {lvl.name}</span>
                                {!isLevelUnlocked && <span className="text-red-400/80">Locked</span>}
                              </div>

                              {isLevelUnlocked ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {lvl.stages.map((stg, stgIdx) => {
                                    const isStageCurrent = lvl.levelNumber === progress.currentLevel && stgIdx + 1 === progress.currentStage;
                                    const isStageCompleted = lvl.levelNumber < progress.currentLevel || 
                                                             (lvl.levelNumber === progress.currentLevel && stgIdx + 1 < progress.currentStage);
                                    
                                    // Hide future stages that are not current and not completed yet
                                    if (!isStageCompleted && !isStageCurrent) return null;

                                    const isCurrentlyReviewingThis = reviewLevelNumber === lvl.levelNumber && reviewStageIndex === stgIdx;
                                    const isActivePlayHighlight = !isReviewing && isStageCurrent;

                                    return (
                                      <button
                                        key={stg.id}
                                        onClick={() => {
                                          if (isStageCurrent) {
                                            setReviewLevelNumber(null);
                                            setReviewStageIndex(null);
                                            setIsReplaying(false);
                                          } else if (isStageCompleted) {
                                            setReviewLevelNumber(lvl.levelNumber);
                                            setReviewStageIndex(stgIdx);
                                            setIsReplaying(false);
                                          }
                                        }}
                                        className={`px-2.5 py-1.5 rounded-xl font-mono text-[9px] font-bold border transition-all flex items-center gap-1 ${
                                          isActivePlayHighlight
                                            ? 'bg-accent border-accent text-white shadow-md shadow-accent/10 animate-pulse'
                                            : isCurrentlyReviewingThis
                                            ? 'bg-accent-gold border-accent-gold text-black shadow-md'
                                            : isStageCompleted
                                            ? 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/20'
                                            : 'bg-surface-2 border-border text-text-muted opacity-40 cursor-not-allowed'
                                        }`}
                                        disabled={!isStageCompleted && !isStageCurrent}
                                      >
                                        {isStageCompleted ? (
                                          <span>S{stgIdx + 1} ✓</span>
                                        ) : isStageCurrent ? (
                                          <>
                                            <Play className="w-2.5 h-2.5 fill-current" />
                                            <span>S{stgIdx + 1}</span>
                                          </>
                                        ) : (
                                          <span>S{stgIdx + 1}</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="h-6 flex items-center bg-surface border border-dashed border-border rounded-xl px-2 text-[9px] font-mono text-text-muted/65 italic gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Complete Level {lvl.levelNumber - 1} to unlock</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Sidebar Dictionary tab
  const renderSidebarDictionary = () => {
    return (
      <div className="space-y-4 text-left">
        <div className="px-1">
          <h4 className="text-[10px] font-mono uppercase text-text-muted tracking-widest">My Vocabulary</h4>
          <p className="text-[11px] text-text-muted">Search and review emotional words you have unlocked.</p>
        </div>

        <div className="space-y-2 px-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search word or meaning..."
              value={vocabSearch}
              onChange={(e) => setVocabSearch(e.target.value)}
              className="w-full text-xs font-mono bg-surface-2 border border-border rounded-xl pl-9 pr-3 py-2 text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <select
            value={vocabFilterCategory}
            onChange={(e) => setVocabFilterCategory(e.target.value)}
            className="w-full text-xs font-mono bg-surface border border-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="All">All Categories</option>
            {dictionaryCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {filteredVocabulary.length > 0 ? (
            filteredVocabulary.map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  const levelIdx = QUEST_LEVELS.findIndex(l => l.name === entry.levelName);
                  if (levelIdx !== -1) {
                    const levelObj = QUEST_LEVELS[levelIdx];
                    const stageIdx = levelObj.stages.findIndex(s => s.id === entry.id);
                    if (stageIdx !== -1) {
                      setReviewLevelNumber(levelObj.levelNumber);
                      setReviewStageIndex(stageIdx);
                      setIsReplaying(false);
                      setIsSidebarOpenMobile(false); // Auto close sidebar on mobile solve jump
                    }
                  }
                }}
                className="w-full text-left bg-surface border border-border hover:border-accent-gold/45 hover:bg-surface-2/40 p-3 rounded-xl transition-all space-y-1 block"
              >
                <div className="flex justify-between items-start">
                  <p className="font-serif text-sm font-bold text-text-primary leading-tight">{entry.targetWord}</p>
                  <span className="text-[8px] font-mono bg-accent-gold/15 text-accent-gold border border-accent-gold/25 px-1.5 py-0.5 rounded">
                    Read 📖
                  </span>
                </div>
                <p className="text-[8px] font-mono text-text-muted uppercase tracking-wider">{entry.category}</p>
                <p className="text-[10px] text-text-muted font-mono line-clamp-2 leading-relaxed">
                  {entry.definition}
                </p>
              </button>
            ))
          ) : (
            <div className="p-8 border border-dashed border-border rounded-xl text-center font-mono text-[10px] text-text-muted leading-relaxed">
              {vocabularyEntries.length === 0 
                ? "No words unlocked yet. Solve stages in Clarity Quest to build your personal lexicon!"
                : "No matching words found."}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Sidebar Cards tab
  const renderSidebarCards = () => {
    return (
      <div className="space-y-4 text-left">
        <div className="px-1">
          <h4 className="text-[10px] font-mono uppercase text-text-muted tracking-widest">My Clarity Cards</h4>
          <p className="text-[11px] text-text-muted">Review your unlocked Clarity Cards.</p>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {collectedCards.length > 0 ? (
            collectedCards.map((card, i) => (
              <div
                key={card.id + i}
                className="bg-surface border border-border p-4 rounded-2xl relative overflow-hidden text-left space-y-2.5"
              >
                <div className="absolute top-0 right-0 w-12 h-12 bg-accent-gold/2 rounded-full filter blur-lg pointer-events-none" />
                
                <div className="flex justify-between items-center border-b border-border/30 pb-1.5">
                  <span className="text-[8px] font-mono text-accent-gold uppercase tracking-wider font-bold">{card.category}</span>
                  <span className="text-[8px] font-mono text-text-muted">{new Date(card.unlockedAt).toLocaleDateString()}</span>
                </div>

                <p className="text-[9px] font-mono text-text-muted leading-relaxed">
                  Context: &quot;{card.sentence}&quot;
                </p>

                <div className="pt-1.5 border-t border-border/25">
                  <p className="text-xs font-mono text-text-primary leading-relaxed italic whitespace-pre-line text-text-muted">
                    {card.cardText}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 border border-dashed border-border rounded-xl text-center font-mono text-[10px] text-text-muted leading-relaxed">
              No cards unlocked yet. Unlock Clarity Cards during your quest to build your collection!
            </div>
          )}
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
      {/* Supabase Schema Missing Warnings */}
      {(dbWarning || vocabDbWarning) && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-start gap-3 text-left">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-xs font-mono font-bold text-yellow-500 uppercase">Database Setup Required</h5>
            <p className="text-[11px] font-mono text-text-muted leading-relaxed">
              Quest data is saving locally but failed to sync online because required tables are missing in Supabase. Please ask the administrator to execute the database schemas:
              {dbWarning && <span className="block mt-1">🔹 <code>docs/quest_progress.sql</code> (Progress Table)</span>}
              {vocabDbWarning && <span className="block mt-1">🔹 <code>docs/quest_vocabulary.sql</code> (Vocabulary Table)</span>}
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
          <div className="text-left">
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
            className="text-[9px] font-mono bg-accent/25 hover:bg-accent/40 text-accent px-2 py-0.5 rounded-lg border border-accent/40 font-bold shadow-sm transition-all"
          >
            Reward
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Quest Canvas - Renders FIRST on mobile (order-1 on mobile, lg:order-2 on desktop) */}
        <main className="lg:col-span-8 space-y-6 order-1 lg:order-2">
          {activeStage ? (
            <div className="bg-surface border border-border p-5 sm:p-6 rounded-2xl relative overflow-hidden space-y-6">
              <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />

              {/* Header inside canvas */}
              <div className="flex justify-between items-center relative z-10 border-b border-border/50 pb-3 text-left">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
                      Lvl {displayLevelNumber} - Stage {displayStageNumber}
                    </span>
                    {isReviewing && (
                      <span className="text-[9px] font-mono uppercase tracking-wider bg-accent-gold/10 border border-accent-gold/30 px-2 py-0.5 rounded-lg text-accent-gold font-bold">
                        Review mode
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isReviewing && !hasForfeited && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-bold ${
                        timeLeft < 30 
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                          : 'bg-surface-2 border-border text-text-muted'
                      }`}>
                        ⏳ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                    {!isReviewing && hasForfeited && (
                      <span className="text-[9px] font-mono bg-red-950/40 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-md font-bold uppercase">
                        Forfeited Pts
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-lg shrink-0">
                  {activeLevel?.category}
                </span>
              </div>

              {/* REVIEW SCREEN COMPONENT (Visible if in review mode and not replaying spelling) */}
              {isReviewing && !isReplaying ? (
                <div className="space-y-6 text-left relative z-10 py-2">
                  <div className="space-y-1">
                    <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-accent font-bold">Teachable Emotional Concept</p>
                    <h2 className="font-serif text-3xl font-bold text-accent-gold">{activeStage.targetWord}</h2>
                  </div>

                  {/* Context sentence */}
                  <div className="p-4 bg-surface-2/60 border border-border rounded-2xl space-y-1.5">
                    <span className="text-[9px] font-mono uppercase text-text-muted">Sentence Context</span>
                    <p className="font-serif text-base text-text-primary italic leading-relaxed">
                      &quot;{activeStage.sentence.replace('{placeholder}', activeStage.targetWord)}&quot;
                    </p>
                  </div>

                  {/* Vocabulary card detail */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface-2/40 border border-border p-4 rounded-2xl space-y-2">
                      <span className="text-[9px] font-mono uppercase text-accent font-bold">Definition</span>
                      <p className="text-xs font-mono text-text-primary leading-relaxed">
                        {activeStage.vocabulary?.definition ?? activeStage.clue}
                      </p>
                    </div>

                    {activeStage.vocabulary?.synonyms && activeStage.vocabulary.synonyms.length > 0 && (
                      <div className="bg-surface-2/40 border border-border p-4 rounded-2xl space-y-2">
                        <span className="text-[9px] font-mono uppercase text-accent font-bold">Synonyms</span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {activeStage.vocabulary.synonyms.map(syn => (
                            <span key={syn} className="text-[10px] font-mono bg-accent/10 text-accent px-2.5 py-1 rounded-xl border border-accent/20">
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Granular Emotional Comparison Card ("Why this word?") */}
                  {(() => {
                    const comparison = getEmotionalGranularityComparison(activeStage.targetWord);
                    return (
                      <div className="border border-accent-gold/25 bg-accent-gold/5 p-4 sm:p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-accent-gold">
                          <Sparkles className="w-4 h-4" />
                          <h4 className="text-xs font-mono uppercase tracking-wider font-bold">Why use {activeStage.targetWord}?</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs leading-relaxed font-mono">
                          <div className="md:col-span-4 bg-surface border border-border p-2.5 rounded-xl">
                            <span className="text-[9px] text-red-400 block uppercase font-bold mb-0.5">Generic Words</span>
                            <span className="line-through text-text-muted">{comparison.generic}</span>
                          </div>
                          <div className="md:col-span-8 bg-surface border border-border p-2.5 rounded-xl text-text-primary">
                            <span className="text-[9px] text-accent block uppercase font-bold mb-0.5">Mindful Nuance</span>
                            <span>{comparison.nuance}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Review Navigation Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevReviewStage}
                        className="px-3 py-2 border border-border hover:bg-surface-2 hover:text-text-primary rounded-xl font-mono text-xs text-text-muted transition-all flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Prev Stage</span>
                      </button>
                      <button
                        onClick={handleNextReviewStage}
                        className="px-3 py-2 border border-border hover:bg-surface-2 hover:text-text-primary rounded-xl font-mono text-xs text-text-muted transition-all flex items-center gap-1"
                      >
                        <span>Next Stage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsReplaying(true);
                          setSelectedIndices([]);
                          setIsSolved(false);
                          setIsFailed(false);
                        }}
                        className="px-4 py-2 border border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent text-accent rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Replay spelling</span>
                      </button>

                      <button
                        onClick={() => {
                          setReviewLevelNumber(null);
                          setReviewStageIndex(null);
                        }}
                        className="px-4 py-2 bg-surface-2 hover:bg-surface border border-border hover:border-accent-gold/45 text-text-primary rounded-xl font-mono text-xs font-bold transition-all"
                      >
                        Resume Active Quest
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* GAME PLAY SCREEN (Active quest stage OR review stage replaying) */
                <>
                  {/* Replay badges */}
                  {isReviewing && (
                    <div className="bg-accent-gold/10 border border-accent-gold/30 p-2.5 rounded-xl flex items-center justify-between text-left relative z-10">
                      <p className="text-[10px] font-mono text-accent-gold font-bold">
                        🎮 Replaying Stage {displayStageNumber} for practice. Points are not awarded.
                      </p>
                      <button
                        onClick={() => setIsReplaying(false)}
                        className="text-[9px] font-mono text-text-muted hover:text-text-primary uppercase tracking-wider underline"
                      >
                        Show concept details
                      </button>
                    </div>
                  )}

                  {/* Insight Clue Card displayed by default BEFORE solve */}
                  {!isSolved && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-accent/5 border border-accent/15 rounded-2xl p-4 text-left space-y-1 relative z-10"
                    >
                      <div className="flex items-center gap-1.5 text-accent">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-mono uppercase tracking-wider font-bold">Emotional Clue Insight</span>
                      </div>
                      <p className="text-xs font-mono text-text-primary leading-relaxed">
                        Concept definition: <span className="italic text-text-muted">&quot;{activeStage.clue || activeStage.vocabulary?.definition}&quot;</span>
                      </p>
                    </motion.div>
                  )}

                  {/* The Sentence with slots */}
                  <div className="space-y-4 relative z-10 text-center">
                    <p className="font-serif text-lg text-text-primary leading-relaxed px-2">
                      {activeStage.sentence.replace('{placeholder}', '__________')}
                    </p>

                    {/* Slots container */}
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
                    {/* Action buttons (Clear / Shuffle) */}
                    <div className="flex justify-center items-center gap-3">
                      {selectedIndices.length > 0 && !isSolved && !isFailed && (
                        <button
                          onClick={handleClearSlots}
                          className="text-[9px] font-mono px-3 py-1.5 bg-surface-2 border border-border hover:border-red-400/30 hover:text-red-400 transition-colors rounded-xl"
                        >
                          Clear Slots
                        </button>
                      )}

                      {!isSolved && !isFailed && (
                        <button
                          onClick={handleShuffleLetters}
                          disabled={shuffleCount >= 3}
                          className="text-[9px] font-mono px-3 py-1.5 bg-surface-2 border border-border hover:border-accent/40 hover:text-accent transition-colors rounded-xl flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Shuffle ({3 - shuffleCount} left)</span>
                        </button>
                      )}
                    </div>

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

                  {/* AI Hint Section */}
                  <div className="pt-2 border-t border-border/40 relative z-10 flex flex-col items-center space-y-3">
                    {aiHint ? (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-accent-gold/5 border border-accent-gold/25 rounded-2xl w-full text-center space-y-2.5"
                      >
                        <div className="flex items-center justify-center gap-1.5 text-accent-gold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Premium Hint Unlocked</span>
                        </div>
                        <p className="text-xs font-mono text-text-primary">
                          Starts with the letter:{' '}
                          <span className="text-white text-sm font-bold bg-accent/25 border border-accent/40 px-2.5 py-1 rounded-lg font-mono">
                            {activeStage.targetWord[0]}
                          </span>
                        </p>
                        <p className="text-xs font-mono text-text-muted italic leading-relaxed">
                          &quot;{aiHint}&quot;
                        </p>
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
                              <span>Unlock Premium AI Clue (0.005 USDm)</span>
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
                            {isReviewing
                              ? 'Stage spelled correctly!'
                              : hasForfeited
                              ? 'Level Solved! (0 points - timer expired)'
                              : `Level Solved! (+${progress.currentLevel} Clarity Points)`}
                          </span>
                        </div>

                        {/* Post-Solve Vocabulary Learning Card */}
                        {activeStage.vocabulary && (
                          <div className="space-y-4 max-w-2xl mx-auto text-left">
                            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 sm:p-5 space-y-3">
                              <div>
                                <p className="text-[8px] font-mono text-accent font-bold uppercase tracking-wider">Unlocked word</p>
                                <p className="font-serif text-2xl font-bold text-text-primary leading-none mt-1">{activeStage.targetWord}</p>
                              </div>
                              
                              <p className="text-xs font-mono text-text-muted leading-relaxed">
                                <span className="font-bold text-text-primary">Meaning:</span> {activeStage.vocabulary.definition}
                              </p>

                              {activeStage.vocabulary.examples.length > 0 && (
                                <p className="text-xs font-mono text-text-muted leading-relaxed">
                                  <span className="font-bold text-text-primary">Examples:</span> &quot;{activeStage.vocabulary.examples.join('" "')}&quot;
                                </p>
                              )}

                              {activeStage.vocabulary.synonyms.length > 0 && (
                                <p className="text-xs font-mono text-text-muted leading-relaxed">
                                  <span className="font-bold text-text-primary">Synonyms:</span> {activeStage.vocabulary.synonyms.join(', ')}
                                </p>
                              )}
                            </div>

                            {/* Granular Emotional Comparison Card ("Why this word?") */}
                            {(() => {
                              const comparison = getEmotionalGranularityComparison(activeStage.targetWord);
                              return (
                                <div className="border border-accent-gold/25 bg-accent-gold/5 p-4 rounded-2xl space-y-2.5">
                                  <div className="flex items-center gap-1 text-accent-gold">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <h4 className="text-[10px] font-mono uppercase tracking-wider font-bold">Why use {activeStage.targetWord}?</h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs leading-relaxed font-mono">
                                    <div className="md:col-span-4 bg-surface border border-border p-2 rounded-xl">
                                      <span className="text-[9px] text-red-400 block uppercase font-bold mb-0.5">Instead of</span>
                                      <span className="line-through text-text-muted">{comparison.generic}</span>
                                    </div>
                                    <div className="md:col-span-8 bg-surface border border-border p-2 rounded-xl text-text-primary">
                                      <span className="text-[9px] text-accent block uppercase font-bold mb-0.5">Say precisely</span>
                                      <span>{comparison.nuance}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Similar words drill down */}
                            {activeStage.vocabulary.similarWords.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">
                                  Similar words — tap a word to learn more
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {activeStage.vocabulary.similarWords.map((item) => (
                                    <button
                                      key={item.word}
                                      type="button"
                                      onClick={() => setSelectedVocabWord(selectedVocabWord?.word === item.word ? null : item)}
                                      className={`rounded-full border px-3 py-1.5 text-[10px] font-mono transition-all ${
                                        selectedVocabWord?.word === item.word
                                          ? 'border-accent bg-accent/15 text-accent shadow-sm'
                                          : 'border-border bg-surface-2 text-text-primary hover:border-accent hover:text-accent'
                                      }`}
                                    >
                                      {item.word}
                                    </button>
                                  ))}
                                </div>

                                {selectedVocabWord && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-2xl border border-border bg-surface-2 p-4 text-xs font-mono text-text-primary space-y-1"
                                  >
                                    <p className="font-bold text-accent">{selectedVocabWord.word}</p>
                                    <p className="text-text-muted leading-relaxed">
                                      {selectedVocabWord.meaning}
                                    </p>
                                  </motion.div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Paid Reframing Response */}
                        {(aiCard || collectedCards.some(c => c.id === activeStage.id)) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-5 border border-accent-gold/40 bg-gradient-to-br from-accent-gold/10 to-surface rounded-[2rem] max-w-md mx-auto space-y-3 shadow-lg shadow-accent-gold/5 text-left"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-accent-gold" />
                              <span className="text-[10px] font-mono uppercase tracking-widest text-text-primary">Clarity Card Unlocked</span>
                            </div>
                            <p className="text-xs font-mono italic leading-relaxed text-text-primary whitespace-pre-line text-text-muted">
                              {aiCard || collectedCards.find(c => c.id === activeStage.id)?.cardText}
                            </p>
                          </motion.div>
                        )}

                        <div className="flex flex-col gap-2.5 max-w-md mx-auto pt-2">
                          <button
                            onClick={handleSolveStage}
                            className="pill-button pill-button-primary w-full py-3.5 text-xs font-mono font-bold"
                          >
                            {isReviewing ? 'Finish Replay & Close' : 'Solve & Next Stage (Free)'}
                          </button>

                          {pendingDictionaryEntry && (
                            <button
                              onClick={handleAddToDictionary}
                              disabled={addingToDictWord !== null}
                              className="pill-button pill-button-secondary bg-surface-2 border border-border hover:bg-surface-3 w-full py-3.5 text-xs font-mono flex items-center justify-center gap-1.5 transition-all text-text-primary"
                            >
                              {addingToDictWord === activeStage.targetWord ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-accent animate-bounce" />
                                  <span>Saved to Dictionary ✓</span>
                                </>
                              ) : (
                                <>
                                  <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                                  <span>Add this word to my dictionary</span>
                                </>
                              )}
                            </button>
                          )}

                          {!aiCard && !collectedCards.some(c => c.id === activeStage.id) && !isReviewing && (
                            <button
                              onClick={handleUnlockCard}
                              disabled={paidLoading}
                              className="pill-button bg-accent-gold/10 border border-accent-gold/40 hover:bg-accent-gold/20 text-accent-gold w-full py-3.5 text-xs font-mono flex items-center justify-center gap-1.5 transition-all"
                            >
                              {paidLoading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>{getStepMessage()}</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Unlock Clarity Card (0.005 USDm)</span>
                                </>
                              )}
                            </button>
                          )}
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
                          <span>{timeLeft <= 0 && !isReviewing ? "Time's Up! ⏰" : "Incorrect spelling 😢"}</span>
                        </div>

                        <p className="text-xs font-mono text-text-muted max-w-sm mx-auto leading-relaxed">
                          {timeLeft <= 0 && !isReviewing
                            ? 'You ran out of time! You can retry to unlock progression, but you forfeit points for this stage.'
                            : `"${selectedIndices.map(idx => shuffledLetters[idx]).join('')}" is not the correct mindful word.`}
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
                </>
              )}
            </div>
          ) : (
            <div className="bg-surface border border-border p-8 rounded-2xl text-center space-y-3">
              <Trophy className="w-10 h-10 text-accent mx-auto animate-bounce" />
              <h3 className="font-serif text-2xl">Quest Mastered!</h3>
              <p className="text-xs font-mono text-text-muted max-w-md mx-auto leading-relaxed">
                Congratulations scribe! You have successfully completed all 10 levels and expanded your emotional vocabulary with more precise, nourishing words.
              </p>
              <button
                onClick={handleResetProgress}
                className="px-4 py-2 border border-border hover:bg-red-950/20 hover:text-red-400 hover:border-red-400/30 rounded-xl font-mono text-xs text-text-muted transition-colors"
              >
                Reset Progress (Start Over)
              </button>
            </div>
          )}
        </main>

        {/* Navigation Sidebar Panel - Renders SECOND on mobile (order-2 on mobile, lg:order-1 on desktop) */}
        <aside className="lg:col-span-4 space-y-6 order-2 lg:order-1">
          {/* Mobile Collapsible Folder Header */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
              className="w-full bg-surface border border-border rounded-2xl p-4 flex items-center justify-between text-left shadow-sm hover:border-accent/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 text-accent rounded-xl">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-serif font-bold text-text-primary">Quest Index & Dictionary</h4>
                  <p className="text-[10px] font-mono text-text-muted">
                    Lvl {progress.currentLevel} • {vocabularyEntries.length} words unlocked
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase bg-accent-gold/15 text-accent-gold px-2 py-0.5 rounded-lg font-bold">
                  {isSidebarOpenMobile ? 'Close' : 'Open Index'}
                </span>
                {isSidebarOpenMobile ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </div>
            </button>
          </div>

          {/* Folder Content - Collapsed on mobile, expanded on desktop */}
          <div className={`${isSidebarOpenMobile ? 'block' : 'hidden lg:block'} space-y-6`}>
            {/* Tab Selector */}
            <div className="flex bg-surface-2 border border-border p-1 rounded-2xl">
              <button
                onClick={() => setSidebarTab('levels')}
                className={`flex-1 text-center py-2 text-[10px] sm:text-xs font-mono font-bold rounded-xl transition-all ${
                  sidebarTab === 'levels'
                    ? 'bg-surface border border-border text-accent shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                🎮 Modules
              </button>
              <button
                onClick={() => setSidebarTab('dictionary')}
                className={`flex-1 text-center py-2 text-[10px] sm:text-xs font-mono font-bold rounded-xl transition-all ${
                  sidebarTab === 'dictionary'
                    ? 'bg-surface border border-border text-accent shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                📖 Vocab ({vocabularyEntries.length})
              </button>
              <button
                onClick={() => setSidebarTab('cards')}
                className={`flex-1 text-center py-2 text-[10px] sm:text-xs font-mono font-bold rounded-xl transition-all ${
                  sidebarTab === 'cards'
                    ? 'bg-surface border border-border text-accent shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                🃏 Clarity Cards ({collectedCards.length})
              </button>
            </div>

            {/* Tab contents */}
            {sidebarTab === 'levels' && renderCategoryNav()}
            {sidebarTab === 'dictionary' && renderSidebarDictionary()}
            {sidebarTab === 'cards' && renderSidebarCards()}
          </div>
        </aside>
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
 
      {/* Success Notification Modal */}
      <AnimatePresence>
        {successModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface border border-border p-6 rounded-3xl max-w-md w-full text-center shadow-2xl relative overflow-hidden space-y-5"
            >
              <div className="halftone-bg absolute inset-0 opacity-5 pointer-events-none" />
              
              <div className="w-14 h-14 bg-accent/15 border border-accent/30 rounded-full flex items-center justify-center mx-auto text-2xl animate-pulse">
                ✨
              </div>
 
              <div className="space-y-2">
                <h3 className="font-serif text-xl font-bold text-accent">{successModal.title}</h3>
                <p className="text-xs font-mono text-text-muted leading-relaxed">{successModal.message}</p>
              </div>
 
              {successModal.txHash && (
                <div className="space-y-2 text-left bg-surface-2 p-3.5 border border-border rounded-2xl">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-text-muted block">Transaction Hash</span>
                  <div className="font-mono text-[10px] break-all text-accent-gold select-all font-bold">
                    {successModal.txHash}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <a
                      href={`https://celoscan.io/tx/${successModal.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-mono bg-accent/10 border border-accent/30 text-accent px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-accent/20 transition-all"
                    >
                      🔗 View on Celoscan
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(successModal.txHash || '');
                        setCopiedHash(true);
                        setTimeout(() => setCopiedHash(false), 2000);
                      }}
                      className="text-[9px] font-mono bg-surface-3 border border-border text-text-muted px-3 py-1.5 rounded-lg flex items-center gap-1 hover:text-text-primary transition-all ml-auto min-w-[75px]"
                    >
                      {copiedHash ? '✓ Copied!' : '📋 Copy Hash'}
                    </button>
                  </div>
                </div>
              )}
 
              <button
                onClick={() => setSuccessModal(null)}
                className="pill-button pill-button-primary w-full py-3 text-xs font-mono font-bold"
              >
                Great!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* Error Notification Modal */}
      <AnimatePresence>
        {errorModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface border border-border p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden space-y-5"
            >
              <div className="halftone-bg absolute inset-0 opacity-5 pointer-events-none" />
              
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-2xl text-red-400">
                ⚠️
              </div>
 
              <div className="space-y-2">
                <h3 className="font-serif text-xl font-bold text-red-400">{errorModal.title}</h3>
                <p className="text-xs font-mono text-text-muted leading-relaxed">{errorModal.message}</p>
              </div>
 
              <button
                onClick={() => setErrorModal(null)}
                className="pill-button bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 w-full py-3 text-xs font-mono font-bold transition-all"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      <ConnectWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </div>
  );
}
