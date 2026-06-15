/** Represents a single AI prompt interaction stored in local history. */
export interface HistoryItem {
  id: string;
  toolId: number;
  toolName: string;
  prompt: string;
  response: string;
  cost: string;
  txHash: string;
  timestamp: number;
}

const HISTORY_KEY = 'micromind_history';

/**
 * Prepends a new item to the local prompt history.
 * Safe to call server-side — returns early if window is undefined.
 */
export function saveToHistory(item: HistoryItem) {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const newHistory = [item, ...history];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
}

/**
 * Retrieves all stored history items, newest first.
 * Falls back to an empty array if storage is unavailable or data is corrupt.
 */
export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(HISTORY_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as HistoryItem[];
  } catch {
    // Corrupt data — reset gracefully
    localStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

/** Returns history items for a specific wallet address. */
export function getHistoryByWallet(address: string): HistoryItem[] {
  return getHistory();
}

/** Removes a single history item by its id. */
export function deleteHistoryItem(id: string): void {
  if (typeof window === 'undefined') return;
  const filtered = getHistory().filter(item => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

/** Removes all history items. */
export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}
