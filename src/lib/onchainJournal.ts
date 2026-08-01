import { decodeEventLog, erc20Abi, toHex, type WalletClient } from 'viem';
import { celo } from 'viem/chains';
import { publicClient } from '@/context/WalletContext';
import { ONCHAIN_JOURNAL_ABI, ONCHAIN_JOURNAL_ADDRESS } from './onchainJournalContract';
import { USDm_ADDRESS } from '@/constants/chains';

export const ONCHAIN_PLAINTEXT_BYTE_LIMIT = 1000;
export const ONCHAIN_JOURNAL_PRICE_USDM = '0.01';
export const ONCHAIN_JOURNAL_PRICE_WEI = BigInt('10000000000000000');
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
  isMiniPay: boolean;
}): Promise<Omit<OnchainJournalLink, 'savedAt'>> {
  const { content, address, walletClient, isMiniPay } = params;
  if (!ONCHAIN_JOURNAL_ADDRESS) throw new Error('Encrypted journal contract is not configured yet.');
  const plaintext = new TextEncoder().encode(content);
  if (!plaintext.byteLength || plaintext.byteLength > ONCHAIN_PLAINTEXT_BYTE_LIMIT) {
    throw new Error(`Entry must be between 1 and ${ONCHAIN_PLAINTEXT_BYTE_LIMIT} UTF-8 bytes.`);
  }

  const feeOptions = isMiniPay ? { feeCurrency: USDm_ADDRESS as `0x${string}` } : {};
  const allowance = await publicClient.readContract({
    address: USDm_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address, ONCHAIN_JOURNAL_ADDRESS],
  });
  if (allowance < ONCHAIN_JOURNAL_PRICE_WEI) {
    const approveCall = {
      account: address,
      address: USDm_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve' as const,
      args: [ONCHAIN_JOURNAL_ADDRESS, ONCHAIN_JOURNAL_PRICE_WEI] as const,
    };
    const approveEstimate = await publicClient.estimateContractGas(Object.assign(approveCall, feeOptions));
    const approveGas = approveEstimate * BigInt(120) / BigInt(100);
    const approveHash = isMiniPay
      ? await walletClient.writeContract(Object.assign({ ...approveCall, chain: celo, gas: approveGas }, feeOptions))
      : await (async () => {
          const approveFees = await publicClient.estimateFeesPerGas();
          return walletClient.writeContract({
            ...approveCall,
            chain: celo,
            gas: approveGas,
            maxFeePerGas: approveFees.maxFeePerGas,
            maxPriorityFeePerGas: approveFees.maxPriorityFeePerGas,
          });
        })();
    const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
    if (approveReceipt.status !== 'success') throw new Error('USDm approval failed.');
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

  const args = [toHex(ciphertext), toHex(iv) as `0x${string}`] as const;
  const call = {
    account: address,
    address: ONCHAIN_JOURNAL_ADDRESS,
    abi: ONCHAIN_JOURNAL_ABI,
    functionName: 'saveEncryptedEntry' as const,
    args,
  };
  const estimatedGas = await publicClient.estimateContractGas(Object.assign(call, feeOptions));
  const gas = estimatedGas * BigInt(120) / BigInt(100);

  // MiniPay has no native CELO and uses USDm as Celo's CIP-64 fee currency.
  // Direct wallets pay CELO with RPC-derived fee fields to prevent injected
  // wallets from applying an excessive gas reservation.
  const transactionHash = isMiniPay
    ? await walletClient.writeContract(Object.assign({ ...call, chain: celo, gas }, feeOptions))
    : await (async () => {
        const fees = await publicClient.estimateFeesPerGas();
        return walletClient.writeContract({
          ...call,
          chain: celo,
          gas,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
      })();
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
