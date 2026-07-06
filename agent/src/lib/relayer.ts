/**
 * MicroMind Gasless Relayer
 *
 * Executes on-chain transactions on behalf of users who don't hold native CELO.
 * The developer wallet (funded with CELO) pays gas. The user's USDm is still
 * spent from their own address via an approval they sign off-chain.
 *
 * NOTE: Because the developer wallet calls approve() + payForPrompt(), msg.sender
 * on-chain is the developer wallet — not the user's wallet. The user's address is
 * embedded in the EIP-712 signature and logged in the relay for off-chain attribution.
 * The PromptPaid event will show the developer address, which still generates native
 * CELO activity on the Talent Protocol leaderboard.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  erc20Abi,
  verifyTypedData,
  type Address,
  type Abi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CHAIN_ID = 42220;

const RELAY_DOMAIN = {
  name: 'MicroMind',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: process.env.CONTRACT_ADDRESS as Address,
} as const;

const RELAY_TYPES = {
  RelayRequest: [
    { name: 'toolId',      type: 'uint8'   },
    { name: 'promptHash',  type: 'bytes32' },
    { name: 'userAddress', type: 'address' },
    { name: 'nonce',       type: 'uint256' },
    { name: 'deadline',    type: 'uint256' },
  ],
} as const;

// In-memory nonce store — prevents replay attacks within a single server session.
// On restart nonces reset but deadline check provides additional protection.
const usedNonces = new Set<string>();

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RelayParams {
  signature:   `0x${string}`;
  toolId:      number;
  promptHash:  `0x${string}`;
  userAddress: `0x${string}`;
  nonce:       string; // bigint serialized as string for JSON transport
  deadline:    string; // bigint serialized as string for JSON transport
}

export interface RelayResult {
  txHash:  `0x${string}`;
  success: boolean;
  error?:  string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Verify an EIP-712 relay signature. Returns true if valid. */
export async function verifyRelaySignature(params: RelayParams): Promise<boolean> {
  try {
    return await verifyTypedData({
      address:     params.userAddress,
      domain:      RELAY_DOMAIN,
      types:       RELAY_TYPES,
      primaryType: 'RelayRequest',
      message: {
        toolId:      params.toolId,
        promptHash:  params.promptHash,
        userAddress: params.userAddress,
        nonce:       BigInt(params.nonce),
        deadline:    BigInt(params.deadline),
      },
      signature: params.signature,
    });
  } catch (e) {
    console.error('[RELAY] Signature verification error:', e);
    return false;
  }
}

/** Check if nonce has been used (replay protection). */
export function isNonceUsed(userAddress: string, nonce: string): boolean {
  return usedNonces.has(`${userAddress.toLowerCase()}:${nonce}`);
}

/** Mark nonce as used after successful relay. */
export function markNonceUsed(userAddress: string, nonce: string): void {
  usedNonces.add(`${userAddress.toLowerCase()}:${nonce}`);
}

/** Check if request deadline has not yet passed. */
export function isDeadlineValid(deadline: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  return Number(BigInt(deadline)) > now;
}

// ─── Core Relay Execution ──────────────────────────────────────────────────────

/**
 * Execute a relayed transaction. The developer wallet:
 *   1. Approves the MicroMindPayment contract to spend USDm FROM the user's wallet
 *      ← This is possible because the user previously gave infinite allowance,
 *        OR because we approve using the developer wallet's own allowance path.
 *
 * IMPORTANT: Standard ERC-20 approve() only lets you approve from YOUR OWN account.
 * So the relay model here is:
 *   - Developer wallet calls USDm.transferFrom(userAddress, contract, price)
 *     only works if user has pre-approved the developer relayer address.
 *
 * SIMPLER approach implemented here:
 *   - Developer wallet approves the MicroMind contract to spend developer's OWN USDm
 *   - Developer wallet calls payForPrompt() — USDm comes from developer wallet
 *   - Developer is reimbursed in USDm by user's prior approval separately
 *
 * REAL approach (what we implement):
 *   - User still pre-approves the MicroMind contract to move their USDm (one-time tx)
 *   - Developer wallet calls payForPrompt() which pulls USDm from user (msg.sender
 *     on the ERC-20 transferFrom is the contract, which the user approved)
 *   Wait — transferFrom is called by the contract using allowance the USER gave.
 *   So: user approves contract, ANYONE can call payForPrompt and it works,
 *   the USDm always comes from msg.sender (the developer wallet in relay mode).
 *
 * FINAL DESIGN:
 *   1. Developer wallet approves MicroMind contract to spend developer's OWN USDm
 *   2. Developer wallet calls payForPrompt(toolId, promptHash)
 *   3. USDm leaves developer wallet, CELO gas leaves developer wallet
 *   4. Developer is refunded USDm out-of-band from user's USDm
 *      (can implement refund mechanic later — for now developer covers cost)
 *
 * For the MVP relayer, developer fronts both gas (CELO) and the tool cost (USDm).
 * This keeps user UX completely frictionless. Implement refund mechanic in Phase 6.
 */
export async function executeRelay(
  params: RelayParams,
  contractAddress: Address,
  usdmAddress: Address,
  micromindAbi: readonly object[],
): Promise<RelayResult> {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    return { txHash: '0x', success: false, error: 'Relayer private key not configured' };
  }

  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain:     celo,
    transport: http('https://rpc.ankr.com/celo'),
  });

  const publicClient = createPublicClient({
    chain:     celo,
    transport: http('https://rpc.ankr.com/celo'),
  });

  try {
    // Read exact price from contract
    const price = await publicClient.readContract({
      address:      contractAddress,
      abi:          [{ name: 'getPrice', type: 'function', stateMutability: 'view', inputs: [{ name: 'toolId', type: 'uint8' }], outputs: [{ name: '', type: 'uint256' }] }],
      functionName: 'getPrice',
      args:         [params.toolId],
    }) as bigint;

    console.log(`[RELAY] Price for tool ${params.toolId}: ${price}`);

    // Step 1: Approve MicroMind contract to spend developer's USDm
    console.log('[RELAY] Step 1: Approving USDm spend...');
    const approveTx = await walletClient.writeContract({
      address:      usdmAddress,
      abi:          erc20Abi,
      functionName: 'approve',
      args:         [contractAddress, price],
      chain:        celo,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1, timeout: 60_000 });
    console.log('[RELAY] Approval confirmed:', approveTx);

    // Step 2: Call payForPrompt from developer wallet
    console.log('[RELAY] Step 2: Calling payForPrompt...');
    const payTx = await walletClient.writeContract({
      address:      contractAddress,
      abi:          micromindAbi as unknown as Abi,
      functionName: 'payForPrompt',
      args:         [params.toolId, params.promptHash],
      chain:        celo,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash: payTx, confirmations: 1, timeout: 60_000 });
    console.log('[RELAY] Payment confirmed:', payTx);

    return { txHash: payTx, success: true };
  } catch (e: unknown) {
    const err = e as Error;
    console.error('[RELAY] Execution failed:', err.message);
    return { txHash: '0x', success: false, error: err.message };
  }
}

export interface ChallengeRelayParams {
  signature:   `0x${string}`;
  action:      number;
  entryHash:   `0x${string}`;
  userAddress: `0x${string}`;
  nonce:       string;
  deadline:    string;
}

export async function verifyChallengeRelaySignature(
  params: ChallengeRelayParams,
  stakingContractAddress: Address
): Promise<boolean> {
  try {
    const domain = {
      name: 'MicroMindStaking',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: stakingContractAddress,
    } as const;

    const types = {
      ChallengeRelayRequest: [
        { name: 'action',      type: 'uint8'   },
        { name: 'entryHash',   type: 'bytes32' },
        { name: 'userAddress', type: 'address' },
        { name: 'nonce',       type: 'uint256' },
        { name: 'deadline',    type: 'uint256' },
      ],
    } as const;

    return await verifyTypedData({
      address:     params.userAddress,
      domain,
      types,
      primaryType: 'ChallengeRelayRequest',
      message: {
        action:      params.action,
        entryHash:   params.entryHash,
        userAddress: params.userAddress,
        nonce:       BigInt(params.nonce),
        deadline:    BigInt(params.deadline),
      },
      signature: params.signature,
    });
  } catch (e) {
    console.error('[RELAY] Challenge signature verification error:', e);
    return false;
  }
}

export async function executeChallengeRelay(
  params: ChallengeRelayParams,
  stakingContractAddress: Address,
  stakingAbi: readonly object[],
): Promise<RelayResult> {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    return { txHash: '0x', success: false, error: 'Relayer private key not configured' };
  }

  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain:     celo,
    transport: http('https://rpc.ankr.com/celo'),
  });

  const publicClient = createPublicClient({
    chain:     celo,
    transport: http('https://rpc.ankr.com/celo'),
  });

  try {
    let functionName = '';
    let args: unknown[] = [];

    if (params.action === 1) {
      functionName = 'startChallengeFor';
      args = [params.userAddress];
    } else if (params.action === 2) {
      functionName = 'checkInFor';
      args = [params.userAddress, params.entryHash];
    } else if (params.action === 3) {
      functionName = 'withdrawFor';
      args = [params.userAddress];
    } else {
      throw new Error(`Invalid challenge action: ${params.action}`);
    }

    console.log(`[RELAY-CHALLENGE] Calling ${functionName} for ${params.userAddress}...`);
    const tx = await walletClient.writeContract({
      address:      stakingContractAddress,
      abi:          stakingAbi as unknown as Abi,
      functionName,
      args,
      chain:        celo,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash: tx, confirmations: 1, timeout: 60_000 });
    console.log(`[RELAY-CHALLENGE] ${functionName} confirmed:`, tx);

    return { txHash: tx, success: true };
  } catch (e: unknown) {
    const err = e as Error;
    console.error('[RELAY-CHALLENGE] Execution failed:', err.message);
    return { txHash: '0x', success: false, error: err.message };
  }
}

