import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(__dirname, '../data/prompts.json');
const RESPONSE_PATH = path.join(__dirname, '../data/responses.json');

if (!fs.existsSync(path.dirname(STORE_PATH))) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
}

function readJSON(filePath: string): Record<string, any> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeJSON(filePath: string, data: Record<string, any>) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Persistent key-value store for submitted prompts.
 *
 * Key:   keccak256 promptHash computed from `${prompt}:${userAddress}:${nonce}`.
 * Value: { prompt, toolId, user, nonce }
 * Backed by: data/prompts.json (file-system fallback when Redis is unavailable).
 */
export const promptStore = {
  /** Persist a prompt payload indexed by its promptHash. */
  set: (hash: string, data: any) => {
    const store = readJSON(STORE_PATH);
    store[hash] = data;
    writeJSON(STORE_PATH, store);
  },
  /** Retrieve a stored prompt payload by promptHash, or null if not found. */
  get: (hash: string) => readJSON(STORE_PATH)[hash] ?? null,
};

/**
 * Persistent key-value store for AI-generated responses.
 *
 * Key:   on-chain transaction hash of the `payForPrompt` call.
 * Value: { response: string, timestamp: number }
 * Backed by: data/responses.json (file-system fallback when Redis is unavailable).
 */
export const responseStore = {
  /** Persist an AI response indexed by its payment transaction hash. */
  set: (txHash: string, response: string) => {
    const store = readJSON(RESPONSE_PATH);
    store[txHash] = { response, timestamp: Date.now() };
    writeJSON(RESPONSE_PATH, store);
  },
  /** Retrieve a stored AI response by transaction hash, or null if not found. */
  get: (txHash: string) => readJSON(RESPONSE_PATH)[txHash] ?? null,
};

