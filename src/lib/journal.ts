import { Smile, Laugh, Meh, Angry, Frown } from 'lucide-react';

const JOURNAL_KEY = "mm_journal";
const FOLDERS_KEY = "mm_journal_folders";

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: string;
  timestamp: number;
  folderId?: string;
  image?: string;
  tags?: string[];
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export const MOOD_ICONS: Record<string, any> = {
  happy: Smile,
  excited: Laugh,
  neutral: Meh,
  angry: Angry,
  sad: Frown,
};

const LEGACY_MOOD_MAP: Record<string, string> = {
  '😊': 'happy',
  '🤩': 'excited',
  '😐': 'neutral',
  '😤': 'angry',
  '😔': 'sad',
};

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function dispatch() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('journal_updated'));
}
export function getEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(JOURNAL_KEY);
  if (!raw) return [];
  try {
    const entries: JournalEntry[] = JSON.parse(raw);
    let migrated = false;
    for (const e of entries) {
      const mapped = LEGACY_MOOD_MAP[e.mood];
      if (mapped) {
        e.mood = mapped;
        migrated = true;
      }
    }
    if (migrated) localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function getEntriesByFolder(folderId: string | null): JournalEntry[] {
  const all = getEntries();
  if (folderId === null) return all;
  return all.filter(e => e.folderId === folderId);
}

export function saveEntry(entry: Omit<JournalEntry, 'id' | 'date' | 'timestamp'>): JournalEntry {
  const entries = getEntries();
  const newEntry: JournalEntry = {
    ...entry,
    id: newId(),
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    timestamp: Date.now(),
  };
  localStorage.setItem(JOURNAL_KEY, JSON.stringify([newEntry, ...entries]));
  dispatch();
  return newEntry;
}

export function editEntry(id: string, updates: Partial<Pick<JournalEntry, 'content' | 'mood' | 'folderId' | 'image' | 'tags'>>): void {
  const entries = getEntries().map(e => e.id === id ? { ...e, ...updates } : e);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  dispatch();
}

export function deleteEntry(id: string): void {
  const entries = getEntries().filter(e => e.id !== id);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  dispatch();
}

// ── Folders ───────────────────────────────────────────────────────────────────

export function getFolders(): Folder[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(FOLDERS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function createFolder(name: string): Folder {
  const folders = getFolders();
  const folder: Folder = { id: newId(), name: name.trim(), createdAt: Date.now() };
  localStorage.setItem(FOLDERS_KEY, JSON.stringify([...folders, folder]));
  return folder;
}

export function renameFolder(id: string, name: string): void {
  const folders = getFolders().map(f => f.id === id ? { ...f, name: name.trim() } : f);
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

export function deleteFolder(id: string): void {
  const entries = getEntries().map(e =>
    e.folderId === id ? { ...e, folderId: undefined } : e
  );
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  const folders = getFolders().filter(f => f.id !== id);
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  dispatch();
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function getLastEntry(): JournalEntry | null {
  return getEntries()[0] ?? null;
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
  const journalEntries = getEntries();
  const journalDates = journalEntries.map(e => getLocalDateString(new Date(e.timestamp)));

  let historyDates: string[] = [];
  const storedHistory = localStorage.getItem('micromind_history');
  if (storedHistory) {
    try {
      const historyItems = JSON.parse(storedHistory);
      if (Array.isArray(historyItems)) {
        historyDates = historyItems.map((item: any) => getLocalDateString(new Date(item.timestamp)));
      }
    } catch { /* ignore */ }
  }

  let manualDates: string[] = [];
  const storedStreak = localStorage.getItem(streakKey);
  let lastCheckInDate = '';
  if (storedStreak) {
    try {
      const data = JSON.parse(storedStreak);
      if (data && Array.isArray(data.history)) manualDates = data.history;
      if (data && data.lastCheckInDate) lastCheckInDate = data.lastCheckInDate;
    } catch { /* ignore */ }
  }

  const allDatesSet = new Set([...journalDates, ...historyDates, ...manualDates]);
  const sortedDates = Array.from(allDatesSet).sort((a, b) => b.localeCompare(a));

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

  localStorage.setItem(streakKey, JSON.stringify({
    streakCount,
    lastCheckInDate: sortedDates[0] || lastCheckInDate,
    history: sortedDates,
  }));

  window.dispatchEvent(new Event('streak_updated'));
}
