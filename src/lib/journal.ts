import type { ComponentType } from 'react';
import { Smile, Laugh, Meh, Angry, Frown } from 'lucide-react';

const JOURNAL_KEY = "mm_journal";
const FOLDERS_KEY = "mm_journal_folders";

// -- Journal content encryption (Supabase sync boundary only) -----------------
//
// Journal content is kept in localStorage as plaintext (device-local threat
// model is out of scope) but encrypted client-side before it ever reaches
// Supabase, using an escrowed per-account AES-GCM-256 key (see AuthContext's
// resolveJournalKey). This protects against a database breach, not against
// the app operator, since the key is escrowed server-side too — the same
// tradeoff already made for the scheduled-letters feature.
//
// Ciphertext is wrapped in a JSON envelope inside the existing `content`
// column so legacy plaintext rows (written before this shipped) keep
// working untouched — they simply fail the `__enc` check and pass through.
// Those legacy rows are NOT retroactively re-encrypted.

let journalKey: string | null = null;

/** Sets (or clears, on sign-out) the in-memory key used to encrypt/decrypt journal content. */
export function setJournalKey(key: string | null): void {
  journalKey = key;
}

async function encryptContent(content: string): Promise<string> {
  if (!journalKey) return content;
  const { encryptText } = await import('./crypto');
  const { ciphertext, iv } = await encryptText(content, journalKey);
  return JSON.stringify({ __enc: true, ciphertext, iv });
}

async function decryptContent(raw: string): Promise<string> {
  let parsed: { __enc?: boolean; ciphertext?: string; iv?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw; // not JSON — legacy plaintext row
  }
  if (!parsed || !parsed.__enc) return raw;
  if (!journalKey) {
    console.warn('No journal key available to decrypt entry');
    return '[Encrypted — key unavailable]';
  }
  try {
    const { decryptText } = await import('./crypto');
    return await decryptText(parsed.ciphertext!, parsed.iv!, journalKey);
  } catch (err) {
    console.warn('Failed to decrypt journal entry content', err);
    return '[Could not decrypt this entry]';
  }
}

// -- Supabase sync helpers (fire-and-forget, never block the UI) --------------

async function getSupabaseSession() {
  if (typeof window === 'undefined') return null;
  const { supabase } = await import('./supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function pushEntryToSupabase(entry: JournalEntry) {
  const session = await getSupabaseSession();
  if (!session) return;
  const { supabase } = await import('./supabase');
  try {
    const { error } = await supabase.from('journal_entries').upsert({
      id: entry.id,
      user_id: session.user.id,
      content: await encryptContent(entry.content),
      mood: entry.mood,
      timestamp: entry.timestamp,
      folder_id: entry.folderId ?? null,
      tags: entry.tags ?? [],
      date: entry.date,
      image: entry.image ?? null,
    }, { onConflict: 'id' });
    if (error) throw error;
  } catch (err) {
    console.warn('Failed pushing to Supabase. Queueing offline sync.', err);
    addToSyncQueue({ id: entry.id, type: 'upsert', entry });
  }
}

async function deleteEntryFromSupabase(id: string) {
  const session = await getSupabaseSession();
  if (!session) return;
  const { supabase } = await import('./supabase');
  try {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', session.user.id);
    if (error) throw error;
  } catch (err) {
    console.warn('Failed deleting from Supabase. Queueing offline sync.', err);
    addToSyncQueue({ id, type: 'delete' });
  }
}

/** Pulls all entries from Supabase and merges them into localStorage. Call on login. */
export async function loadEntriesFromSupabase(): Promise<void> {
  const session = await getSupabaseSession();
  if (!session) return;
  const { supabase } = await import('./supabase');
  const { data } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', session.user.id)
    .order('timestamp', { ascending: false });

  if (!data || data.length === 0) return;

  const remote: JournalEntry[] = await Promise.all(data.map(async (row) => ({
    id: row.id,
    date: row.date,
    content: await decryptContent(row.content),
    mood: row.mood,
    timestamp: row.timestamp,
    folderId: row.folder_id ?? undefined,
    image: row.image ?? undefined,
    tags: row.tags ?? [],
  })));

  // Merge: remote wins on conflict (same id), keep any local-only entries
  const local = getEntries();
  const remoteIds = new Set(remote.map(e => e.id));
  const localOnly = local.filter(e => !remoteIds.has(e.id));
  const merged = [...remote, ...localOnly].sort((a, b) => b.timestamp - a.timestamp);

  if (typeof window !== 'undefined') {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event('journal_updated'));
  }
}

/** Pushes all localStorage entries to Supabase. Call on first login to migrate existing data. */
export async function migrateLocalEntriesToSupabase(): Promise<void> {
  const session = await getSupabaseSession();
  if (!session) return;
  const entries = getEntries();
  if (!entries.length) return;
  const { supabase } = await import('./supabase');
  const rows = await Promise.all(entries.map(async (e) => ({
    id: e.id,
    user_id: session.user.id,
    content: await encryptContent(e.content),
    mood: e.mood,
    timestamp: e.timestamp,
    folder_id: e.folderId ?? null,
    tags: e.tags ?? [],
    date: e.date,
    image: e.image ?? null,
  })));
  await supabase.from('journal_entries').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
}

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

export const MOOD_ICONS: Record<string, ComponentType<{ className?: string }>> = {
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

// -- Entries

/** Returns all journal entries sorted newest-first. Migrates legacy emoji moods. */
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

/** Saves a new journal entry. Sanitizes content to prevent XSS. */
export function saveEntry(entry: Omit<JournalEntry, 'id' | 'date' | 'timestamp'>): JournalEntry {
  const entries = getEntries();
  const sanitizedContent = entry.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  const newEntry: JournalEntry = {
    ...entry,
    content: sanitizedContent,
    id: newId(),
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    timestamp: Date.now(),
  };
  localStorage.setItem(JOURNAL_KEY, JSON.stringify([newEntry, ...entries]));
  
  // Set habit state for journal completion
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getLocalDateString(new Date());
  setDailyHabitState(todayStr, { journalDone: true }, null); // will sync automatically
  
  pushEntryToSupabase(newEntry).catch(() => {});
  dispatch();
  return newEntry;
}

/** Updates fields of an existing journal entry by id. */
export function editEntry(id: string, updates: Partial<Pick<JournalEntry, 'content' | 'mood' | 'folderId' | 'image' | 'tags'>>): void {
  const entries = getEntries().map(e => e.id === id ? { ...e, ...updates } : e);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  const updated = entries.find(e => e.id === id);
  if (updated) pushEntryToSupabase(updated).catch(() => {});
  dispatch();
}

/** Deletes a journal entry by id. */
export function deleteEntry(id: string): void {
  const entries = getEntries().filter(e => e.id !== id);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  deleteEntryFromSupabase(id).catch(() => {});
  dispatch();
}

// -- Folders   

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

// -- Utilities  

/** Returns the most recently created entry, or null if none exist. */
export function getLastEntry(): JournalEntry | null {
  return getEntries()[0] ?? null;
}

/** Returns the N most recent journal entries. */
export function getRecentEntries(n: number): JournalEntry[] {
  return getEntries().slice(0, n);
}


export interface DailyHabitState {
  date: string; // YYYY-MM-DD
  journalDone: boolean;
  gameplayDone: boolean;
}

export function getDailyHabitState(dateStr: string, walletAddress: string | null): DailyHabitState {
  if (typeof window === 'undefined') {
    return { date: dateStr, journalDone: false, gameplayDone: false };
  }
  const key = walletAddress ? `mm_habit_${walletAddress}_${dateStr}` : `mm_habit_${dateStr}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch { /* ignore */ }
  }

  // Fallback: check if they have a journal entry on this date
  const journalEntries = getEntries();
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const hasJournal = journalEntries.some(e => getLocalDateString(new Date(e.timestamp)) === dateStr);

  return {
    date: dateStr,
    journalDone: hasJournal,
    gameplayDone: false
  };
}

export function setDailyHabitState(dateStr: string, state: Partial<DailyHabitState>, walletAddress: string | null): void {
  if (typeof window === 'undefined') return;
  const key = walletAddress ? `mm_habit_${walletAddress}_${dateStr}` : `mm_habit_${dateStr}`;
  const current = getDailyHabitState(dateStr, walletAddress);
  const updated = { ...current, ...state };
  localStorage.setItem(key, JSON.stringify(updated));
  
  // Trigger updateStreak to ensure streak counter stays in sync
  updateStreak(walletAddress);
}

/**
 * Updates the daily activity streak for a wallet.
 * Merges journal dates, prompt history dates, and manual check-in dates.
 */
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
        historyDates = historyItems.map((item: { timestamp: number }) => getLocalDateString(new Date(item.timestamp)));
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
  
  // Scan habit states where either journal or gameplay is done
  if (typeof window !== 'undefined') {
    const prefix = walletAddress ? `mm_habit_${walletAddress}_` : `mm_habit_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const stateObj = JSON.parse(localStorage.getItem(key) || '');
          if (stateObj && (stateObj.journalDone || stateObj.gameplayDone)) {
            allDatesSet.add(stateObj.date);
          }
        } catch {}
      }
    }
  }

  const sortedDates = Array.from(allDatesSet).sort((a, b) => b.localeCompare(a));

  let streakCount = 0;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const hasToday = allDatesSet.has(todayStr);
  const hasYesterday = allDatesSet.has(yesterdayStr);

  if (hasToday || hasYesterday) {
    const currentCheckDate = hasToday ? new Date() : yesterday;
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

// -- Offline Sync Queue logic

export interface SyncOperation {
  id: string;
  type: 'upsert' | 'delete';
  entry?: JournalEntry;
}

const SYNC_QUEUE_KEY = 'mm_journal_sync_queue';

export function getSyncQueue(): SyncOperation[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SyncOperation[];
  } catch {
    return [];
  }
}

export function saveSyncQueue(queue: SyncOperation[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function addToSyncQueue(op: SyncOperation) {
  const queue = getSyncQueue();
  // Filter out older duplicate operations for the same ID to avoid redundant work
  const filtered = queue.filter(item => !(item.id === op.id && item.type === op.type));
  filtered.push(op);
  saveSyncQueue(filtered);
}

export async function syncOfflineQueue(): Promise<void> {
  const session = await getSupabaseSession();
  if (!session) return;
  const queue = getSyncQueue();
  if (queue.length === 0) return;

  const { supabase } = await import('./supabase');
  const remaining: SyncOperation[] = [];

  for (const op of queue) {
    try {
      if (op.type === 'upsert' && op.entry) {
        const { error } = await supabase.from('journal_entries').upsert({
          id: op.entry.id,
          user_id: session.user.id,
          content: await encryptContent(op.entry.content),
          mood: op.entry.mood,
          timestamp: op.entry.timestamp,
          folder_id: op.entry.folderId ?? null,
          tags: op.entry.tags ?? [],
          date: op.entry.date,
          image: op.entry.image ?? null,
        }, { onConflict: 'id' });
        if (error) throw error;
      } else if (op.type === 'delete') {
        const { error } = await supabase.from('journal_entries').delete().eq('id', op.id).eq('user_id', session.user.id);
        if (error) throw error;
      }
    } catch (err) {
      console.warn('Failed to sync offline operation, keeping in queue:', err);
      remaining.push(op);
    }
  }

  saveSyncQueue(remaining);
}
