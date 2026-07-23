import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { setDailyHabitState } from '@/lib/journal';

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

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
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

  /** Writes progress to a local cache for fast reads on next mount. This is a
   * read-through cache only — the agent backend is the sole writer of
   * clarity_points (see docs/quest_security_hardening.sql); the client never
   * pushes financial state directly anymore. */
  const persistLocal = useCallback((updated: QuestProgressState, key: string) => {
    localStorage.setItem(key, JSON.stringify(updated));
  }, []);

  // Load progress
  useEffect(() => {
    async function loadProgress() {
      const hasLocalData = localStorage.getItem(storageKey) !== null;
      if (!hasLocalData) {
        setLoading(true);
      }

      let local: QuestProgressState | null = null;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          local = JSON.parse(stored);
        } catch {}
      }

      if (dbUser) {
        try {
          const { data, error } = await supabase
            .from('quest_progress')
            .select('*')
            .eq('user_id', dbUser.id)
            .maybeSingle();

          if (error) throw error;

          // Remote (written only by the agent) is always authoritative once it
          // exists. If no row exists yet, the first solve/reset call creates one
          // server-side — there's nothing for the client to push up anymore.
          const dbState: QuestProgressState | null = data ? {
            currentLevel: data.current_level,
            currentStage: data.current_stage,
            completedLevels: data.completed_levels || [],
            clarityPoints: data.clarity_points || 0,
          } : null;

          const resolved = dbState ?? local ?? DEFAULT_STATE;
          setState(resolved);
          persistLocal(resolved, storageKey);
          setLoading(false);
          return;
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
  }, [dbUser, storageKey, persistLocal]);

  /**
   * Submits a solved stage to the agent, which independently verifies the
   * answer against its own copy of the level data and only advances/awards
   * points server-side (see POST /api/quest/solve in agent/src/index.ts).
   * The client no longer computes or pushes clarityPoints itself.
   */
  const solveStage = useCallback(async (levelNumber: number, stageIndex: number, submittedWord: string, forfeited: boolean) => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
    if (!agentUrl) {
      console.error('[QUEST SOLVE] Agent URL not configured');
      return { success: false, error: 'Agent URL not configured' };
    }

    const token = await getAccessToken();
    if (!token) {
      return { success: false, error: 'Not signed in' };
    }

    try {
      const res = await fetch(`${agentUrl}/api/quest/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ levelNumber, stageIndex, submittedWord, forfeited }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to record stage solve' };
      }

      const updated: QuestProgressState = data.progress;
      setState(updated);
      persistLocal(updated, storageKey);

      const getLocalDateString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      setDailyHabitState(getLocalDateString(new Date()), { gameplayDone: true }, address);

      return { success: true, pointsEarned: data.pointsEarned as number };
    } catch (e) {
      console.error('[QUEST SOLVE ERROR]', e);
      return { success: false, error: 'Network error' };
    }
  }, [storageKey, address, persistLocal]);

  /** Reflects a withdrawal locally — the agent's /api/quest/withdraw endpoint
   * is the one that actually deducts clarity_points server-side; this just
   * keeps the UI/local cache in sync with what it already did. */
  const deductPoints = useCallback((amount: number) => {
    const nextPoints = Math.max(0, state.clarityPoints - amount);
    const updated = { ...state, clarityPoints: nextPoints };
    setState(updated);
    persistLocal(updated, storageKey);
  }, [state, storageKey, persistLocal]);

  // Reset Progress — safe to keep simple since it only ever zeroes state, never grants value.
  const resetProgress = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
    const token = await getAccessToken();
    if (!agentUrl || !token) {
      setState(DEFAULT_STATE);
      persistLocal(DEFAULT_STATE, storageKey);
      return;
    }

    try {
      const res = await fetch(`${agentUrl}/api/quest/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const updated: QuestProgressState = data.progress ?? DEFAULT_STATE;
      setState(updated);
      persistLocal(updated, storageKey);
    } catch (e) {
      console.error('[QUEST RESET ERROR]', e);
      setState(DEFAULT_STATE);
      persistLocal(DEFAULT_STATE, storageKey);
    }
  }, [storageKey, persistLocal]);

  return {
    progress: state,
    loading,
    dbWarning,
    solveStage,
    deductPoints,
    resetProgress,
  };
}
