import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { setDailyHabitState } from '@/lib/journal';
import { QUEST_LEVELS } from '@/constants/levels';

const PROGRESS_KEY = 'mm_quest_progress';

export interface QuestProgressState {
  currentLevel: number; // 1 to 10
  currentStage: number; // 1-indexed, up to total stages for this level
  completedLevels: number[];
  clarityPoints: number;
}

const DEFAULT_STATE: QuestProgressState = {
  currentLevel: 1,
  currentStage: 1,
  completedLevels: [],
  clarityPoints: 0,
};

/** Local cache shape — carries an updatedAt stamp so load-time merges can
 * tell which copy (local vs remote) is genuinely newer, instead of assuming
 * "more points" means "more recent." That assumption breaks for withdrawals,
 * which legitimately *decrease* points — a stale local cache holding the
 * pre-withdrawal total would otherwise look "ahead" and get pushed back up,
 * resurrecting points that were already cashed out. */
interface StoredProgress extends QuestProgressState {
  updatedAt: number;
}

export function useQuestProgress(address: string | null) {
  const [state, setState] = useState<QuestProgressState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [dbWarning, setDbWarning] = useState<boolean>(false);

  // Sync address changes
  const storageKey = address ? `${PROGRESS_KEY}_${address}` : PROGRESS_KEY;

  // Listen to Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setDbUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setDbUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Push updates to database
  const pushToDatabase = useCallback(async (updated: QuestProgressState, userId: string) => {
    try {
      const { error } = await supabase.from('quest_progress').upsert({
        user_id: userId,
        current_level: updated.currentLevel,
        current_stage: updated.currentStage,
        completed_levels: updated.completedLevels,
        clarity_points: updated.clarityPoints,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) {
        console.error('[SYNC QUEST PROGRESS DATABASE ERROR]', error);
      }
    } catch (e) {
      console.error('[SYNC QUEST PROGRESS ERROR]', e);
    }
  }, []);

  /** Writes progress to localStorage stamped with the current time, for merge comparisons on next load. */
  const persistLocal = useCallback((updated: QuestProgressState, key: string) => {
    const stored: StoredProgress = { ...updated, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(stored));
  }, []);

  // Load progress
  useEffect(() => {
    async function loadProgress() {
      const hasLocalData = localStorage.getItem(storageKey) !== null;
      if (!hasLocalData) {
        setLoading(true);
      }
      
      // 1. Try local storage first
      let local: StoredProgress | null = null;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          local = JSON.parse(stored);
        } catch {}
      }

      // 2. Try Supabase if logged in
      if (dbUser) {
        try {
          const { data, error } = await supabase
            .from('quest_progress')
            .select('*')
            .eq('user_id', dbUser.id)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            const dbState: QuestProgressState = {
              currentLevel: data.current_level,
              currentStage: data.current_stage,
              completedLevels: data.completed_levels || [],
              clarityPoints: data.clarity_points || 0,
            };
            const dbUpdatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;

            // Merge by recency, not by "more points wins" — a decrease (e.g. a
            // withdrawal) is a legitimate, more-recent write that a stale local
            // cache would otherwise look "behind" on and incorrectly overwrite.
            if (!local || dbUpdatedAt >= local.updatedAt) {
              setState(dbState);
              persistLocal(dbState, storageKey);
              setLoading(false);
              return;
            } else {
              // Local has a genuinely newer write than remote (e.g. an offline solve) — push it up.
              setState(local);
              await pushToDatabase(local, dbUser.id);
              setLoading(false);
              return;
            }
          } else {
            // No record found on remote, initialize it with current local or DEFAULT_STATE
            const stateToPush = local || DEFAULT_STATE;
            setState(stateToPush);
            persistLocal(stateToPush, storageKey);
            await pushToDatabase(stateToPush, dbUser.id);
            setLoading(false);
            return;
          }
        } catch (e: unknown) {
          const err = e as { code?: string; message?: string };
          console.error('[LOAD QUEST PROGRESS ERROR]', err);
          if (err && (err.code === 'PGRST205' || err.message?.includes('does not exist'))) {
            setDbWarning(true);
          }
        }
      }
 
      if (local) {
        setState(local);
      } else {
        setState(DEFAULT_STATE);
      }
      setLoading(false);
    }
 
    loadProgress();
  }, [dbUser, storageKey, pushToDatabase, persistLocal]);

  // Complete current stage
  const solveStage = useCallback(async (pointsEarned: number) => {
    const levelConfig = QUEST_LEVELS.find(l => l.levelNumber === state.currentLevel);
    if (!levelConfig) return;

    const totalStages = levelConfig.stages.length;
    let nextLevel = state.currentLevel;
    let nextStage = state.currentStage + 1;
    let nextCompleted = [...state.completedLevels];

    // Earn Clarity Points
    const nextPoints = state.clarityPoints + pointsEarned;

    // Check if level is completed
    if (nextStage > totalStages) {
      nextCompleted = Array.from(new Set([...nextCompleted, state.currentLevel]));
      if (state.currentLevel < 10) {
        nextLevel = state.currentLevel + 1;
        nextStage = 1;
      } else {
        // Mastered Level 10
        nextStage = totalStages; // lock at final stage
      }
    }

    const updated: QuestProgressState = {
      currentLevel: nextLevel,
      currentStage: nextStage,
      completedLevels: nextCompleted,
      clarityPoints: nextPoints,
    };

    setState(updated);
    persistLocal(updated, storageKey);

    // Update Streak check-in daily habit
    const getLocalDateString = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalDateString(new Date());
    setDailyHabitState(todayStr, { gameplayDone: true }, address);

    // Sync to Supabase
    if (dbUser) {
      await pushToDatabase(updated, dbUser.id);
    }
  }, [state, storageKey, dbUser, pushToDatabase, address, persistLocal]);

  // Deduct points (on withdrawal)
  const deductPoints = useCallback(async (amount: number) => {
    const nextPoints = Math.max(0, state.clarityPoints - amount);
    const updated = { ...state, clarityPoints: nextPoints };
    setState(updated);
    persistLocal(updated, storageKey);
    if (dbUser) {
      await pushToDatabase(updated, dbUser.id);
    }
  }, [state, storageKey, dbUser, pushToDatabase, persistLocal]);

  // Reset Progress (dev or helper option)
  const resetProgress = useCallback(async () => {
    setState(DEFAULT_STATE);
    persistLocal(DEFAULT_STATE, storageKey);
    if (dbUser) {
      await pushToDatabase(DEFAULT_STATE, dbUser.id);
    }
  }, [storageKey, dbUser, pushToDatabase, persistLocal]);

  return {
    progress: state,
    loading,
    dbWarning,
    solveStage,
    deductPoints,
    resetProgress,
  };
}
