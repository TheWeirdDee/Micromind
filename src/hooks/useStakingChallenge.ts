import { useState, useEffect, useCallback } from 'react';
import { erc20Abi, keccak256, toBytes } from 'viem';
import { celo } from 'viem/chains';
import { useWallet } from '@/context/WalletContext';
import { STAKING_CONTRACT_ADDRESS, MICROMIND_STAKING_ABI } from '@/lib/contract';
import { USDm_ADDRESS } from '@/constants/chains';
import { buildChallengeRelayRequest, signChallengeRelayRequest } from '@/lib/eip712';

export interface StakingChallengeState {
  startTime: number;
  checkInCount: number;
  active: boolean;
  claimed: boolean;
}

export interface StakingChallengeParams {
  stakeAmount: bigint;
  challengeDuration: number;
  requiredCheckins: number;
  rewardAmount: bigint;
}

export type StakingStep =
  | 'idle'
  | 'loading'
  | 'approving'
  | 'signing'
  | 'submitting'
  | 'confirming'
  | 'complete'
  | 'error';

export function useStakingChallenge() {
  const { address, walletClient, publicClient, isMiniPay } = useWallet();
  const [challenge, setChallenge] = useState<StakingChallengeState | null>(null);
  const [checkedInDays, setCheckedInDays] = useState<boolean[]>([]);
  const [params, setParams] = useState<StakingChallengeParams | null>(null);
  const [step, setStep] = useState<StakingStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isDeployed, setIsDeployed] = useState<boolean>(true);

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;

  const isContractDeployed =
    !!STAKING_CONTRACT_ADDRESS &&
    STAKING_CONTRACT_ADDRESS.startsWith('0x') &&
    STAKING_CONTRACT_ADDRESS.length === 42 &&
    STAKING_CONTRACT_ADDRESS.toLowerCase() !== '0x0000000000000000000000000000000000000000';

  const fetchChallengeState = useCallback(async () => {
    if (!address) return;

    if (!isContractDeployed) {
      setIsDeployed(false);
      setChallenge({ startTime: 0, checkInCount: 0, active: false, claimed: false });
      return;
    }

    try {
      setIsDeployed(true);
      // 1. Read challenge parameters if not loaded yet
      if (!params) {
        const [stake, duration, required, reward] = await Promise.all([
          publicClient.readContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: MICROMIND_STAKING_ABI,
            functionName: 'stakeAmount',
          }),
          publicClient.readContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: MICROMIND_STAKING_ABI,
            functionName: 'challengeDuration',
          }),
          publicClient.readContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: MICROMIND_STAKING_ABI,
            functionName: 'requiredCheckins',
          }),
          publicClient.readContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: MICROMIND_STAKING_ABI,
            functionName: 'rewardAmount',
          }),
        ]);

        setParams({
          stakeAmount: stake as bigint,
          challengeDuration: Number(duration),
          requiredCheckins: Number(required),
          rewardAmount: reward as bigint,
        });
      }

      // 2. Read user's challenge state
      const userChallenge = (await publicClient.readContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: MICROMIND_STAKING_ABI,
        functionName: 'challenges',
        args: [address as `0x${string}`],
      })) as [bigint, number, boolean, boolean];

      const state: StakingChallengeState = {
        startTime: Number(userChallenge[0]),
        checkInCount: Number(userChallenge[1]),
        active: userChallenge[2],
        claimed: userChallenge[3],
      };

      setChallenge(state);

      // 3. Read check-in days
      if (state.startTime > 0) {
        const days = (await publicClient.readContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: MICROMIND_STAKING_ABI,
          functionName: 'getCheckedInDays',
          args: [address as `0x${string}`],
        })) as boolean[];
        setCheckedInDays(days);
      } else {
        setCheckedInDays([]);
      }
    } catch (e: any) {
      console.error('[STAKING] Failed to fetch challenge state:', e);
      setIsDeployed(false);
      setChallenge({ startTime: 0, checkInCount: 0, active: false, claimed: false });
    }
  }, [address, params, publicClient, isContractDeployed]);

  // Load state on mount and address change
  useEffect(() => {
    if (address) {
      fetchChallengeState();
    } else {
      setChallenge(null);
      setCheckedInDays([]);
    }
  }, [address, fetchChallengeState]);

  /** Checks if user has checked in today (during current 24 hour window) */
  const hasCheckedInToday = useCallback(() => {
    if (!challenge || challenge.startTime === 0 || !challenge.active) return false;
    const elapsed = Math.floor(Date.now() / 1000) - challenge.startTime;
    const dayIndex = Math.floor(elapsed / 86400);
    return checkedInDays[dayIndex] || false;
  }, [challenge, checkedInDays]);

  /** Gets days remaining in the challenge */
  const getDaysRemaining = useCallback(() => {
    if (!challenge || challenge.startTime === 0 || !challenge.active || !params) return 0;
    const elapsed = Math.floor(Date.now() / 1000) - challenge.startTime;
    const totalDurationSec = params.challengeDuration * 86400;
    if (elapsed >= totalDurationSec) return 0;
    return Math.ceil((totalDurationSec - elapsed) / 86400);
  }, [challenge, params]);

  /** 1. Join Challenge via ERC20 Approve + EIP-712 Relayer */
  const joinChallenge = useCallback(async () => {
    if (!address || !walletClient || !params || !agentUrl) {
      setError('Connection not ready');
      return;
    }

    setError(null);
    setTxHash(null);
    setStep('approving');

    try {
      // Step 1: ERC-20 Approve
      const approveNonce = isMiniPay
        ? await publicClient.getTransactionCount({ address: address as `0x${string}`, blockTag: 'pending' })
        : undefined;

      const approveGas = isMiniPay
        ? await publicClient.estimateContractGas({
            address: USDm_ADDRESS as `0x${string}`,
            abi: erc20Abi,
            functionName: 'approve',
            args: [STAKING_CONTRACT_ADDRESS as `0x${string}`, params.stakeAmount],
            account: address as `0x${string}`,
            feeCurrency: USDm_ADDRESS as `0x${string}`,
          } as any).catch(() => BigInt(100_000))
        : undefined;

      const approveTx = await walletClient.writeContract(Object.assign({
        address: USDm_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve' as const,
        args: [STAKING_CONTRACT_ADDRESS as `0x${string}`, params.stakeAmount] as const,
        chain: celo,
        account: address as `0x${string}`,
        ...(approveNonce !== undefined ? { nonce: approveNonce } : {}),
        ...(approveGas !== undefined ? { gas: approveGas } : {}),
      }, isMiniPay ? { feeCurrency: USDm_ADDRESS as `0x${string}` } : {}));

      setStep('confirming');
      await publicClient.waitForTransactionReceipt({ hash: approveTx, confirmations: 1, timeout: 60_000 });

      // Step 2: Sign typed registration message
      setStep('signing');
      const request = buildChallengeRelayRequest(1, '0x0000000000000000000000000000000000000000000000000000000000000000', address as `0x${string}`);
      const signature = await signChallengeRelayRequest(
        walletClient as any,
        address as `0x${string}`,
        STAKING_CONTRACT_ADDRESS,
        request
      );

      // Step 3: Relay transaction
      setStep('submitting');
      const res = await fetch(`${agentUrl}/api/challenge/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          action: 1,
          entryHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          userAddress: address,
          nonce: request.nonce.toString(),
          deadline: request.deadline.toString(),
        }),
      }).then(r => r.json());

      if (res.error) throw new Error(res.error);

      setTxHash(res.txHash);
      setStep('complete');
      await fetchChallengeState();
    } catch (e: any) {
      console.error('[STAKING] Start Challenge Failed:', e);
      setError(e.message || 'Failed to start challenge');
      setStep('error');
    }
  }, [address, walletClient, params, agentUrl, isMiniPay, publicClient, fetchChallengeState]);

  /** 2. Check In via gasless entry check-in relay */
  const checkIn = useCallback(async (entryText: string) => {
    if (!address || !walletClient || !agentUrl) {
      setError('Connection not ready');
      return;
    }

    setError(null);
    setTxHash(null);
    setStep('signing');

    try {
      // Calculate SHA-256 hash of the entry content client-side
      const encoder = new TextEncoder();
      const data = encoder.encode(entryText);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const entryHash = ('0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

      // Sign typed check-in message
      const request = buildChallengeRelayRequest(2, entryHash, address as `0x${string}`);
      const signature = await signChallengeRelayRequest(
        walletClient as any,
        address as `0x${string}`,
        STAKING_CONTRACT_ADDRESS,
        request
      );

      // Relay transaction
      setStep('submitting');
      const res = await fetch(`${agentUrl}/api/challenge/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          action: 2,
          entryHash,
          userAddress: address,
          nonce: request.nonce.toString(),
          deadline: request.deadline.toString(),
        }),
      }).then(r => r.json());

      if (res.error) throw new Error(res.error);

      setTxHash(res.txHash);
      setStep('complete');
      await fetchChallengeState();
    } catch (e: any) {
      console.error('[STAKING] Check-In Failed:', e);
      setError(e.message || 'Failed to check in');
      setStep('error');
    }
  }, [address, walletClient, agentUrl, fetchChallengeState]);

  /** 3. Withdraw via gasless relayer */
  const withdraw = useCallback(async () => {
    if (!address || !walletClient || !agentUrl) {
      setError('Connection not ready');
      return;
    }

    setError(null);
    setTxHash(null);
    setStep('signing');

    try {
      // Sign typed withdrawal message
      const request = buildChallengeRelayRequest(3, '0x0000000000000000000000000000000000000000000000000000000000000000', address as `0x${string}`);
      const signature = await signChallengeRelayRequest(
        walletClient as any,
        address as `0x${string}`,
        STAKING_CONTRACT_ADDRESS,
        request
      );

      // Relay transaction
      setStep('submitting');
      const res = await fetch(`${agentUrl}/api/challenge/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          action: 3,
          entryHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          userAddress: address,
          nonce: request.nonce.toString(),
          deadline: request.deadline.toString(),
        }),
      }).then(r => r.json());

      if (res.error) throw new Error(res.error);

      setTxHash(res.txHash);
      setStep('complete');
      await fetchChallengeState();
    } catch (e: any) {
      console.error('[STAKING] Withdrawal Failed:', e);
      setError(e.message || 'Failed to withdraw');
      setStep('error');
    }
  }, [address, walletClient, agentUrl, fetchChallengeState]);

  return {
    challenge,
    checkedInDays,
    params,
    step,
    error,
    txHash,
    isDeployed,
    loading: step === 'loading',
    hasCheckedInToday,
    getDaysRemaining,
    joinChallenge,
    checkIn,
    withdraw,
    refresh: fetchChallengeState,
  };
}
