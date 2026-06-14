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

export function saveToHistory(item: HistoryItem) {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const newHistory = [item, ...history];
  localStorage.setItem('micromind_history', JSON.stringify(newHistory));
}

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('micromind_history');
  return stored ? JSON.parse(stored) : [];
}

export function getHistoryByWallet(address: string): HistoryItem[] {
  return getHistory();
}
