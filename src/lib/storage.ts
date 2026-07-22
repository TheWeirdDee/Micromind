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
 * Pulls the authoritative prompt_history rows (written server-side by the agent)
 * and merges them into localStorage — mirrors journal.ts's loadEntriesFromSupabase.
 * De-dupes by txHash (not id, since ids are generated independently client/server-side).
 * Old, local-only history predating this feature is never migrated up — accepted gap.
 */
export async function loadHistoryFromSupabase(): Promise<void> {
  if (typeof window === 'undefined') return;
  const { supabase } = await import('./supabase');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data } = await supabase
    .from('prompt_history')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (!data || data.length === 0) return;

  const remote: HistoryItem[] = data.map((row) => ({
    id: row.id,
    toolId: row.tool_id,
    toolName: row.tool_name,
    prompt: row.prompt,
    response: row.response,
    cost: row.cost,
    txHash: row.tx_hash,
    timestamp: new Date(row.created_at).getTime(),
  }));

  const local = getHistory();
  const remoteTxHashes = new Set(remote.map((r) => r.txHash));
  const localOnly = local.filter((l) => !remoteTxHashes.has(l.txHash));
  const merged = [...remote, ...localOnly].sort((a, b) => b.timestamp - a.timestamp);

  localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event('journal_updated'));
}

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
export function getHistoryByWallet(): HistoryItem[] {
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
