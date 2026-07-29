/**
 * MicroMind Gasless Relayer
 *
 * Executes on-chain transactions on behalf of users who don't hold native CELO
 * (chiefly MiniPay users). The developer/relayer wallet pays CELO gas for the
 * on-chain call itself, but the USDm price of whatever's being paid for comes
 * out of the USER's own wallet, via payForPromptFor(user, ...) pulling from
 * an allowance the user pre-approved (see usePayForPrompt.ts's
 * ensureRelayAllowance — that approve() is paid for in USDm gas via
 * feeCurrency, never CELO, so this still requires no native CELO from the
 * user). The relayer's own USDm balance is never spent.
 *
 * The user's authorization is verified off-chain via their own EIP-712
 * signature (verifyRelaySignature below) before any of this runs.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  verifyTypedData,
  type Address,
  type Abi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { supabase } from './supabase';

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

// Fallback in-memory nonce store — only used if Supabase isn't configured
// (e.g. local dev). In production `claimNonce` persists to the `relay_nonces`
// table (see docs/relay_nonces.sql) so replay protection survives restarts.
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

/**
 * Atomically claim a (userAddress, nonce) pair for replay protection.
 * Returns true if this is the first time the pair has been seen (claim
 * succeeded — caller may proceed), false if it was already claimed (reject
 * as a replay). Doing this as a single insert-or-fail operation — instead of
 * a separate "is it used" check followed by a later "mark it used" write —
 * closes the race where two concurrent requests for the same signed payload
 * could both pass the check before either one recorded its claim.
 */
export async function claimNonce(userAddress: string, nonce: string): Promise<boolean> {
  const key = `${userAddress.toLowerCase()}:${nonce}`;

  if (!supabase) {
    // Local-dev fallback only — not durable across restarts.
    if (usedNonces.has(key)) return false;
    usedNonces.add(key);
    return true;
  }

  const { error } = await supabase
    .from('relay_nonces')
    .insert({ user_address: userAddress.toLowerCase(), nonce });

  if (error) {
    // Unique-violation error code means someone already claimed this nonce.
    if (error.code === '23505') return false;
    // Any other DB error: fail closed rather than silently allowing a
    // potential replay through.
    console.error('[RELAY] Nonce claim failed:', error.message);
    return false;
  }

  return true;
}

/** Check if request deadline has not yet passed. */
export function isDeadlineValid(deadline: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  return Number(BigInt(deadline)) > now;
}

// ─── Core Relay Execution ──────────────────────────────────────────────────────

/**
 * Execute a relayed AI-tool payment. The relayer (developer) wallet pays the
 * CELO gas for this call — that's the entire point of "gasless" for MiniPay
 * users, who typically hold no CELO — but the actual USDm price is pulled
 * from the USER's own wallet via payForPromptFor(user, ...), using an
 * allowance the user pre-approved themselves (paid for in USDm gas via
 * feeCurrency, not CELO — see usePayForPrompt.ts's ensureRelayAllowance).
 * The relayer's own USDm balance is never spent here.
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
  void usdmAddress; // no longer used here — the relayer never spends its own USDm

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
    console.log(`[RELAY] Calling payForPromptFor for ${params.userAddress}, tool ${params.toolId}...`);
    const payTx = await walletClient.writeContract({
      address:      contractAddress,
      abi:          micromindAbi as unknown as Abi,
      functionName: 'payForPromptFor',
      args:         [params.userAddress, params.toolId, params.promptHash],
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

    // Actions 1/2 (relayer-only entrypoints) can be flipped off on-chain via
    // setRelayerPaused during a suspected key-compromise incident. Check first
    // so we don't burn CELO gas on a transaction guaranteed to revert.
    if (params.action === 1 || params.action === 2) {
      const paused = await publicClient.readContract({
        address: stakingContractAddress,
        abi: stakingAbi as unknown as Abi,
        functionName: 'relayerPaused',
      }) as boolean;
      if (paused) {
        return { txHash: '0x', success: false, error: 'Relayer temporarily paused for this action. Please try again later.' };
      }
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

