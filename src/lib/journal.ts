const JOURNAL_KEY = "mm_journal";

export interface JournalEntry {
  id: string;
  date: string;         // e.g. "June 3, 2026"
  content: string;
  mood: string;         // emoji string: "😊" | "😐" | "😔" | "😤" | "🤩"
  timestamp: number;    // Date.now()
}

export function getEntries(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(JOURNAL_KEY);
  if (!raw) return [];
  try {
    const entries: JournalEntry[] = JSON.parse(raw);
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error("Failed to parse journal entries", e);
    return [];
  }
}

export function saveEntry(entry: Omit<JournalEntry, "id" | "date" | "timestamp">): JournalEntry {
  const entries = getEntries();
  
  // Safe UUID generation fallback for non-secure contexts if crypto.randomUUID is not present
  const id = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  const newEntry: JournalEntry = {
    ...entry,
    id,
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    timestamp: Date.now(),
  };
  
  localStorage.setItem(JOURNAL_KEY, JSON.stringify([newEntry, ...entries]));
  
  // Trigger custom event so components (like DailyStreak) can know database changed
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("journal_updated"));
  }
  
  return newEntry;
}

export function deleteEntry(id: string): void {
  const entries = getEntries().filter(e => e.id !== id);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("journal_updated"));
  }
}

export function getLastEntry(): JournalEntry | null {
  const entries = getEntries();
  return entries[0] ?? null;
}

export function getRecentEntries(n: number): JournalEntry[] {
  return getEntries().slice(0, n);
}

export function updateStreak(walletAddress: string | null): void {
  if (typeof window === 'undefined') return;
  const streakKey = walletAddress ? `micromind_streak_data_${walletAddress}` : 'micromind_streak_data';
  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);

  const stored = localStorage.getItem(streakKey);
  let streak = {
    streakCount: 0,
    lastCheckInDate: '',
    history: [] as string[]
  };

  if (stored) {
    try {
      streak = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse streak data', e);
    }
  }

  // If last check-in was before yesterday, reset streak count to 0 (but keep history or clear if broken)
  if (streak.lastCheckInDate && streak.lastCheckInDate !== today && streak.lastCheckInDate !== yesterday) {
    streak.streakCount = 0;
    streak.history = [];
  }

  // Update streak if not already checked in today
  if (streak.lastCheckInDate !== today) {
    if (streak.lastCheckInDate === yesterday) {
      streak.streakCount += 1;
    } else {
      streak.streakCount = 1;
      streak.history = [];
    }
    streak.lastCheckInDate = today;
    if (!streak.history.includes(today)) {
      streak.history.push(today);
    }
    localStorage.setItem(streakKey, JSON.stringify(streak));
    
    // Dispatch custom event to let components (like DailyStreak) know it has updated
    window.dispatchEvent(new Event("streak_updated"));
  }
}

