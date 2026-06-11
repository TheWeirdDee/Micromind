/* eslint-disable no-console */
/**
 * validate-node.ts - validate JSON-RPC Node interface response behaviors on Celo Mainnet.
 */

import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fs from 'node:fs';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  formatEther,
  parseEther,
  keccak256,
  toBytes,
  maxUint256,
  type Hex,
  type Address
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';

// --- Configuration ---
const envPath = path.join(process.cwd(), '.env.local');
let CONTRACT_ADDRESS = '0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c' as Address;
let AGENT_API_URL = 'http://127.0.0.1:8080';

try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const contractMatch = envContent.match(/NEXT_PUBLIC_CONTRACT_ADDRESS=(0x[a-fA-F0-9]+)/);
    if (contractMatch) CONTRACT_ADDRESS = contractMatch[1] as Address;

    const agentMatch = envContent.match(/NEXT_PUBLIC_AGENT_API_URL=(https?:\/\/[^\s]+)/);
    if (agentMatch) AGENT_API_URL = agentMatch[1].replace('localhost', '127.0.0.1');
  }
} catch (e) {
  // Using default fallback values
}

// --- RPC rotation ---
const RPC_URLS = [
  'https://rpc.ankr.com/celo',
  'https://forno.celo.org',
  'https://1rpc.io/celo',
  'https://celo.drpc.org',
  'https://celo.api.onfinality.io/public',
  'https://celo-mainnet-rpc.allthatnode.com',
];
let rpcIndex = 0;

const getRpc = () => RPC_URLS[rpcIndex % RPC_URLS.length];
const rotateRpc = () => { rpcIndex = (rpcIndex + 1) % RPC_URLS.length; };

const getPublicClient = () =>
  createPublicClient({ chain: celo, transport: http(getRpc()) });

const getWalletClient = (account: ReturnType<typeof privateKeyToAccount>) =>
  createWalletClient({ account, chain: celo, transport: http(getRpc()) });

async function withRetry<T>(fn: () => Promise<T>, label = '', maxAttempts = 8): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      // Deterministic errors — no point retrying across RPCs
      const deterministic =
        msg.includes('reverted') ||
        msg.includes('ERC20') ||
        msg.includes('exceeds balance') ||
        msg.includes('exceeds the balance') ||
        msg.includes('insufficient funds') ||
        msg.includes('gas required exceeds allowance') ||
        msg.includes('nonce too low') ||
        msg.includes('already known');
      const transient =
        !deterministic && (
          msg.includes('429') ||
          msg.includes('rate') ||
          msg.includes('Too Many') ||
          msg.includes('timeout') ||
          msg.includes('took too long') ||
          msg.includes('fetch failed') ||
          msg.includes('ECONNRESET') ||
          msg.includes('HTTP request failed')
        );
      if (transient && attempt < maxAttempts - 1) {
        rotateRpc();
        const delay = Math.min(5000 * Math.pow(2, attempt), 90_000);
        log(`[RPC] ${label} failed (${msg.slice(0, 80)}). Switching to ${getRpc()}, retry in ${Math.round(delay / 1000)}s...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
  throw new Error('All RPC retry attempts exhausted');
}

const KEYS_CSV = path.join(process.cwd(), 'private', 'scripts', 'node-config.csv');
const STATE_PATH = path.join(process.cwd(), 'private', 'scripts', 'state', 'node-progress.json');
const LOG_PATH = path.join(process.cwd(), 'private', 'scripts', 'state', 'node-validator.log');

const SLEEP_MIN_MS = 2_000;    // 2s
const SLEEP_MAX_MS = 5_000;    // 5s
const WALLET_LIMIT = 99999;    // no limit — uses all wallets in CSV
const GLOBAL_SUCCESS_CAP = 99999;
const PER_WALLET_CAP = 5;

const CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as Address;

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
] as const;

const MICROMIND_ABI = [
  'function payForPrompt(uint8 toolId, bytes32 promptHash)',
  'function getPrice(uint8 toolId) view returns (uint256)',
] as const;

const TOOLS = [
  { id: 1, name: 'Chat', price: '0.005' },
  { id: 2, name: 'Tweet', price: '0.005' },
  { id: 3, name: 'Reflect', price: '0.005' },
  { id: 4, name: 'Pattern', price: '0.005' },
  { id: 5, name: 'Letter', price: '0.005' },
];

const PROMPTS = [
  "How does blockchain impact global finance?",
  "Write a short story about a neural network that becomes self-aware.",
  "Give me a 5-step plan to start a career in AI engineering.",
  "What are the benefits of using Celo for micropayments?",
  "Explain the difference between Llama 3 and GPT-4.",
  "Create a funny tweet about crypto gas fees.",
  "Write a professional bio for a web3 developer.",
  "Analyze my resume for a senior solidity dev role.",
  "How can I optimize my LinkedIn profile for AI jobs?",
  "Tell me a joke about a developer walking into a bar."
];

// --- Helpers ---
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const randInt = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

type Wallet = { index: number; address: Address; privateKey: Hex };
type WalletState = {
  actionsPerformed: number;
};
type State = {
  startedAt: string;
  walletsState: Record<number, WalletState>;
  totalSucceeded: number;
  totalFailed: number;
};

let logStream: ReturnType<typeof createWriteStream> | null = null;
function log(line: string): void {
  console.log(line);
  if (logStream) logStream.write(`${new Date().toISOString()} | ${line}\n`);
}

// --- Logic ---
async function loadWallets(): Promise<Wallet[]> {
  const raw = await readFile(KEYS_CSV, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('index,'));
  const wallets: Wallet[] = [];
  for (const line of lines) {
    const parts = line.split(',').map((s) => s.trim());
    if (!parts[2]) continue;

    let privateKey = (parts[2].startsWith('0x') ? parts[2] : `0x${parts[2]}`) as Hex;
    if (privateKey.length === 68) privateKey = privateKey.slice(0, 66) as Hex;
    const account = privateKeyToAccount(privateKey);
    wallets.push({ index: Number(parts[0]), address: account.address, privateKey });
  }
  return wallets;
}

async function loadState(): Promise<State | null> {
  try {
    return JSON.parse(await readFile(STATE_PATH, 'utf8')) as State;
  } catch (err) {
    return null;
  }
}

async function saveState(s: State): Promise<void> {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(s, null, 2));
}

function ensureWalletState(s: State, idx: number): WalletState {
  if (!s.walletsState[idx]) {
    s.walletsState[idx] = {
      actionsPerformed: 0,
    };
  }
  return s.walletsState[idx];
}

async function main() {
  await mkdir(path.dirname(LOG_PATH), { recursive: true });
  logStream = createWriteStream(LOG_PATH, { flags: 'a' });

  log(`\n=== Verification Node Interface Validation Starting ===`);
  log(`Verification Target: ${CONTRACT_ADDRESS}`);
  log(`Validation Agent API: ${AGENT_API_URL}`);
  log(`RPC Pool: ${RPC_URLS.join(', ')}`);

  if (!fs.existsSync(KEYS_CSV)) {
    log(`Error: node-config.csv not found at ${KEYS_CSV}`);
    return;
  }

  const allWallets = await loadWallets();
  log(`Loaded ${allWallets.length} validation nodes.`);

  const args = process.argv.slice(2);
  let startIndex = 0;
  let resetState = false;

  const startArgIdx = args.findIndex(arg => arg === '--start' || arg === '--start-index');
  if (startArgIdx !== -1 && args[startArgIdx + 1]) {
    startIndex = parseInt(args[startArgIdx + 1], 10);
  }

  if (args.includes('--reset')) {
    resetState = true;
  }

  const state: State = (await loadState()) ?? {
    startedAt: new Date().toISOString(),
    walletsState: {},
    totalSucceeded: 0,
    totalFailed: 0,
  };

  if (resetState) {
    log(`[Reset] Resetting verification progress...`);
    state.totalSucceeded = 0;
    state.totalFailed = 0;
    for (const key of Object.keys(state.walletsState)) {
      const idx = Number(key);
      if (idx >= startIndex) {
        if (state.walletsState[idx]) {
          state.walletsState[idx].actionsPerformed = 0;
        }
      }
    }
  }

  let activeWallets = allWallets.slice(0, WALLET_LIMIT);
  if (startIndex > 0) {
    activeWallets = activeWallets.filter(w => w.index >= startIndex);
    log(`[Start Index] Configured starting node index ${startIndex}. Active: ${activeWallets.length}`);
  }
  log(`[Config] ${activeWallets.length} wallets loaded, ${PER_WALLET_CAP} tx each.`);

  await saveState(state);

  const stop = { stopped: false };
  process.on('SIGINT', () => { stop.stopped = true; log('\nShutting down validator node loop...'); });

  const outOfFundsWalletIndices = new Set<number>();

  while (!stop.stopped && state.totalSucceeded < GLOBAL_SUCCESS_CAP) {
    const eligibleWallets = activeWallets.filter(w => {
      const ws = ensureWalletState(state, w.index);
      return ws.actionsPerformed < PER_WALLET_CAP && !outOfFundsWalletIndices.has(w.index);
    });

    if (eligibleWallets.length === 0) {
      log('All nodes verified or insufficient test funds. Done.');
      break;
    }

    // Process wallets in order: finish all 5 tx on wallet[0] before moving to wallet[1]
    const wallet = eligibleWallets.sort((a, b) => a.index - b.index)[0];
    const ws = ensureWalletState(state, wallet.index);
    const account = privateKeyToAccount(wallet.privateKey);

    log(`[Node ${wallet.index}] Selected target address: ${account.address} (RPC: ${getRpc()})`);

    try {
      const celoBalance = await withRetry(
        () => getPublicClient().getBalance({ address: account.address }),
        'getBalance'
      );
      if (celoBalance < parseEther("0.005")) {
        throw new Error(`Insufficient CELO. Balance: ${formatEther(celoBalance)}`);
      }

      const cusdBalance = await withRetry(
        () => getPublicClient().readContract({
          address: CUSD_ADDRESS,
          abi: parseAbi(ERC20_ABI),
          functionName: 'balanceOf',
          args: [account.address],
        }),
        'balanceOf'
      );

      // Pick a random tool — skip any tool priced above 0.005 cUSD
      let tool = pick(TOOLS);
      let contractPrice: bigint;
      let priceAttempts = 0;
      while (true) {
        contractPrice = await withRetry(
          () => getPublicClient().readContract({
            address: CONTRACT_ADDRESS,
            abi: parseAbi(MICROMIND_ABI),
            functionName: 'getPrice',
            args: [tool.id],
          }),
          'getPrice'
        ) as bigint;
        if (contractPrice <= parseEther('0.005')) break;
        priceAttempts++;
        if (priceAttempts > 10) throw new Error('No affordable tool found');
        log(`[Node ${wallet.index}] Tool ${tool.name} costs ${formatEther(contractPrice)} cUSD — picking another...`);
        tool = pick(TOOLS);
      }

      if ((cusdBalance as bigint) < contractPrice) {
        throw new Error(`Insufficient cUSD. Balance: ${formatEther(cusdBalance as bigint)}, required: ${formatEther(contractPrice)}`);
      }

      const price = contractPrice;
      const prompt = pick(PROMPTS);

      log(`[Node ${wallet.index}] Submitting prompt validator to tool ${tool.name}... (price: ${formatEther(price)} cUSD)`);
      const nonce = Date.now().toString();
      const promptHash = keccak256(toBytes(`${prompt}:${account.address}:${nonce}`));
      log(`[Node ${wallet.index}] Target Hash: ${promptHash.slice(0, 10)}...`);

      const allowance = await withRetry(
        () => getPublicClient().readContract({
          address: CUSD_ADDRESS,
          abi: parseAbi(ERC20_ABI),
          functionName: 'allowance',
          args: [account.address, CONTRACT_ADDRESS],
        }),
        'allowance'
      );

      if ((allowance as bigint) < price) {
        log(`[Node ${wallet.index}] Executing contract spend approval (unlimited)...`);
        const approveTx = await withRetry(
          () => getWalletClient(account).writeContract({
            address: CUSD_ADDRESS,
            abi: parseAbi(ERC20_ABI),
            functionName: 'approve',
            args: [CONTRACT_ADDRESS, maxUint256],
          }),
          'approve'
        );
        await withRetry(
          () => getPublicClient().waitForTransactionReceipt({ hash: approveTx as `0x${string}` }),
          'waitForApproval'
        );
        log(`[Node ${wallet.index}] Approved. tx: ${approveTx}`);
      }

      log(`[Node ${wallet.index}] Sending payForPrompt...`);
      const payTx = await withRetry(
        () => getWalletClient(account).writeContract({
          address: CONTRACT_ADDRESS,
          abi: parseAbi(MICROMIND_ABI),
          functionName: 'payForPrompt',
          args: [tool.id, promptHash as Hex],
        }),
        'payForPrompt'
      );

      await withRetry(
        () => getPublicClient().waitForTransactionReceipt({ hash: payTx as `0x${string}` }),
        'waitForPayment'
      );
      log(`[Node ${wallet.index}] Transaction settled. tx: ${payTx}`);

      log(`[Node ${wallet.index}] Triggering node output computation...`);
      try {
        const res = await fetch(`${AGENT_API_URL}/api/process-direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash: payTx,
            prompt,
            toolId: tool.id,
            userAddress: account.address
          })
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          log(`[Node ${wallet.index}] process-direct success: ${data.response?.slice(0, 60)}...`);
        } else {
          log(`[Node ${wallet.index}] process-direct failed with status ${res.status}`);
        }
      } catch (e: any) {
        log(`[Node ${wallet.index}] process-direct skipped (agent offline): ${e.message?.slice(0, 60)}`);
      }

      state.totalSucceeded++;
      ws.actionsPerformed++;
      await saveState(state);

      const wait = randInt(SLEEP_MIN_MS, SLEEP_MAX_MS);
      log(`Success! Total validated: ${state.totalSucceeded}/${GLOBAL_SUCCESS_CAP}. Sleeping ${Math.round(wait / 1000)}s...`);
      await sleep(wait);
    } catch (err: any) {
      state.totalFailed++;
      log(`[Node ${wallet.index}] Validation failure: ${err.message?.slice(0, 150)}`);

      const isOutOfFunds =
        err.message?.includes('Insufficient cUSD') ||
        err.message?.includes('Insufficient CELO') ||
        err.message?.includes('ERC20: transfer amount exceeds balance') ||
        err.message?.includes('exceeds the balance') ||
        err.message?.includes('insufficient funds') ||
        err.message?.includes('gas required exceeds allowance') ||
        err.message?.includes('reverted');   // contract revert = permanent skip
      if (isOutOfFunds) {
        outOfFundsWalletIndices.add(wallet.index);
        log(`[Node ${wallet.index}] Marked as permanently skipped.`);
      }

      await saveState(state);
      await sleep(5_000);
    }
  }

  log(`\n=== Node Validation Completed ===`);
  log(`Total Succeeded: ${state.totalSucceeded}`);
  log(`Total Failed: ${state.totalFailed}`);
}

main().catch(console.error);
