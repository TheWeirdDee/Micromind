import { decodeEventLog, toHex, type WalletClient } from 'viem';
import { publicClient } from '@/context/WalletContext';
import { ONCHAIN_JOURNAL_ABI, ONCHAIN_JOURNAL_ADDRESS } from './onchainJournalContract';

export const ONCHAIN_PLAINTEXT_BYTE_LIMIT = 1000;
const KEY_MESSAGE =
  'MicroMind encrypted journal key v1\n\nSigning recreates your private decryption key. This does not create a transaction.';

export type OnchainJournalLink = {
  transactionHash: `0x${string}`;
  entryId?: string;
  savedAt: number;
};

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export async function saveEncryptedJournalOnchain(params: {
  content: string;
  address: `0x${string}`;
  walletClient: WalletClient;
}): Promise<Omit<OnchainJournalLink, 'savedAt'>> {
  const { content, address, walletClient } = params;
  if (!ONCHAIN_JOURNAL_ADDRESS) throw new Error('Encrypted journal contract is not configured yet.');
  const plaintext = new TextEncoder().encode(content);
  if (!plaintext.byteLength || plaintext.byteLength > ONCHAIN_PLAINTEXT_BYTE_LIMIT) {
    throw new Error(`Entry must be between 1 and ${ONCHAIN_PLAINTEXT_BYTE_LIMIT} UTF-8 bytes.`);
  }

  const signature = await walletClient.signMessage({ account: address, message: KEY_MESSAGE });
  const material = new TextEncoder().encode(
    `micromind:onchain-journal:v1:${address.toLowerCase()}:${signature}`,
  );
  const digest = await crypto.subtle.digest('SHA-256', material);
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  );

  const transactionHash = await walletClient.writeContract({
    account: address,
    address: ONCHAIN_JOURNAL_ADDRESS,
    abi: ONCHAIN_JOURNAL_ABI,
    functionName: 'saveEncryptedEntry',
    args: [toHex(ciphertext), toHex(iv) as `0x${string}`],
    chain: walletClient.chain,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
  let entryId: string | undefined;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: ONCHAIN_JOURNAL_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'EncryptedEntrySaved') {
        entryId = decoded.args.entryId.toString();
        break;
      }
    } catch {}
  }
  return { transactionHash, entryId };
}

export function saveOnchainLink(
  journalId: string,
  receipt: Omit<OnchainJournalLink, 'savedAt'>,
): void {
  localStorage.setItem(`mm_onchain_journal_${journalId}`, JSON.stringify({
    ...receipt,
    savedAt: Date.now(),
  }));
}

export function getOnchainLink(journalId: string): OnchainJournalLink | null {
  try {
    const raw = localStorage.getItem(`mm_onchain_journal_${journalId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
