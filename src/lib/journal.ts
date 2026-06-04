import { Smile, Laugh, Meh, Angry, Frown } from 'lucide-react';

const JOURNAL_KEY = "mm_journal";

export interface JournalEntry {
  id: string;
  date: string;         // e.g. "June 3, 2026"
  content: string;
  mood: string;         // e.g. "happy" | "excited" | "neutral" | "angry" | "sad"
  timestamp: number;    // Date.now()
}

export const MOOD_ICONS: Record<string, any> = {
  happy: Smile,
  excited: Laugh,
  neutral: Meh,
  angry: Angry,
  sad: Frown,
  '😊': Smile,
  '🤩': Laugh,
  '😐': Meh,
  '😤': Angry,
  '😔': Frown,
};

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
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(new Date());

  // 1. Get all dates from journal entries
  const journalEntries = getEntries();
  const journalDates = journalEntries.map(e => getLocalDateString(new Date(e.timestamp)));

  // 2. Get all dates from prompt history
  let historyDates: string[] = [];
  const storedHistory = localStorage.getItem('micromind_history');
  if (storedHistory) {
    try {
      const historyItems = JSON.parse(storedHistory);
      if (Array.isArray(historyItems)) {
        historyDates = historyItems.map((item: any) => getLocalDateString(new Date(item.timestamp)));
      }
    } catch (e) {
      console.error('Failed to parse prompt history for streak', e);
    }
  }

  // 3. Get all dates from manual checkins if any
  let manualDates: string[] = [];
  const storedStreak = localStorage.getItem(streakKey);
  let lastCheckInDate = '';
  if (storedStreak) {
    try {
      const data = JSON.parse(storedStreak);
      if (data && Array.isArray(data.history)) {
        manualDates = data.history;
      }
      if (data && data.lastCheckInDate) {
        lastCheckInDate = data.lastCheckInDate;
      }
    } catch (e) {
      console.error('Failed to parse manual streak checkins', e);
    }
  }

  // 4. Combine and get unique dates sorted descending
  const allDatesSet = new Set([...journalDates, ...historyDates, ...manualDates]);
  const sortedDates = Array.from(allDatesSet).sort((a, b) => b.localeCompare(a));

  // 5. Calculate streak count
  let streakCount = 0;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const hasToday = allDatesSet.has(todayStr);
  const hasYesterday = allDatesSet.has(yesterdayStr);

  if (hasToday || hasYesterday) {
    let currentCheckDate = hasToday ? new Date() : yesterday;
    
    while (true) {
      const checkStr = getLocalDateString(currentCheckDate);
      if (allDatesSet.has(checkStr)) {
        streakCount++;
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const calculatedLastCheckInDate = sortedDates[0] || lastCheckInDate;

  const result = {
    streakCount,
    lastCheckInDate: calculatedLastCheckInDate,
    history: sortedDates,
  };

  localStorage.setItem(streakKey, JSON.stringify(result));
  
  // Dispatch custom event to let components (like DailyStreak) know it has updated
  window.dispatchEvent(new Event("streak_updated"));
}


