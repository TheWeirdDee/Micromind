import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(__dirname, '../data/prompts.json');
const RESPONSE_PATH = path.join(__dirname, '../data/responses.json');

// Ensure data directory exists
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

export const promptStore = {
  set: (hash: string, data: any) => {
    const store = readJSON(STORE_PATH);
    store[hash] = data;
    writeJSON(STORE_PATH, store);
  },
  get: (hash: string) => readJSON(STORE_PATH)[hash] ?? null,
};

export const responseStore = {
  set: (txHash: string, response: string) => {
    const store = readJSON(RESPONSE_PATH);
    store[txHash] = { response, timestamp: Date.now() };
    writeJSON(RESPONSE_PATH, store);
  },
  get: (txHash: string) => readJSON(RESPONSE_PATH)[txHash] ?? null,
};
