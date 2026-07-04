/**
 * EIP-712 typed data schema for MicroMind's gasless relay.
 *
 * Flow:
 *   1. Frontend builds a RelayRequest using buildRelayRequest()
 *   2. User signs it via walletClient.signTypedData() — no gas, just a signature
 *   3. Signature + request is sent to POST /api/relay on the agent backend
 *   4. Backend verifies sig, then submits the on-chain txs using the developer wallet
 */

import { CONTRACT_ADDRESS } from '@/lib/contract';

/** Celo Mainnet chain ID */
const CHAIN_ID = 42220;

/** EIP-712 domain for MicroMind — must match the backend verifier exactly */
export const RELAY_DOMAIN = {
  name: 'MicroMind',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: CONTRACT_ADDRESS,
} as const;

/** EIP-712 type definitions for a relay request */
export const RELAY_TYPES = {
  RelayRequest: [
    { name: 'toolId',      type: 'uint8'   },
    { name: 'promptHash',  type: 'bytes32' },
    { name: 'userAddress', type: 'address' },
    { name: 'nonce',       type: 'uint256' },
    { name: 'deadline',    type: 'uint256' },
  ],
} as const;

export interface RelayRequest {
  toolId:      number;
  promptHash:  `0x${string}`;
  userAddress: `0x${string}`;
  nonce:       bigint;
  deadline:    bigint;
}

/**
 * Build a RelayRequest ready to be signed with signTypedData.
 * Deadline defaults to 5 minutes from now.
 */
export function buildRelayRequest(
  toolId: number,
  promptHash: `0x${string}`,
  userAddress: `0x${string}`,
): RelayRequest {
  const nonce    = BigInt(Date.now()); // millisecond timestamp — unique per request
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
  return { toolId, promptHash, userAddress, nonce, deadline };
}

/**
 * Sign a RelayRequest using the connected walletClient.
 * Returns the hex signature string.
 */
export async function signRelayRequest(
  walletClient: { signTypedData: (args: unknown) => Promise<`0x${string}`> },
  userAddress: `0x${string}`,
  request: RelayRequest,
): Promise<`0x${string}`> {
  return walletClient.signTypedData({
    account:     userAddress,
    domain:      RELAY_DOMAIN,
    types:       RELAY_TYPES,
    primaryType: 'RelayRequest',
    message: {
      toolId:      request.toolId,
      promptHash:  request.promptHash,
      userAddress: request.userAddress,
      nonce:       request.nonce,
      deadline:    request.deadline,
    },
  });
}
