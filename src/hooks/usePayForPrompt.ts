'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { parseUnits, keccak256, encodePacked } from 'viem';
import { MICROMIND_ABI, ERC20_ABI } from '@/lib/contract';
import { publicClient } from '@/lib/viem';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const CUSD_ADDRESS = process.env.NEXT_PUBLIC_CUSD_ADDRESS as `0x${string}`;

export function usePayForPrompt() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  const pay = async (toolId: number, prompt: string, price: string) => {
    if (!address || !walletClient) return null;

    try {
      setLoading(true);
      setStep(1); // Preparing prompt

      // 1. Get prompt hash from agent API (simulated or real)
      // For this demo, we'll generate it locally but in production, 
      // the agent should store it first.
      const nonce = Date.now();
      const promptHash = keccak256(
        encodePacked(
          ['string', 'address', 'uint256'],
          [prompt, address, BigInt(nonce)]
        )
      );

      // In real scenario, we POST to agent API here
      // await fetch(`${process.env.NEXT_PUBLIC_AGENT_API_URL}/api/prompt/submit`, { ... })

      setStep(2); // Confirm in MiniPay (Approve)
      const amount = parseUnits(price, 18);

      const { request: approveRequest } = await publicClient.simulateContract({
        account: address,
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, amount],
      });

      const approveHash = await walletClient.writeContract(approveRequest);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setStep(3); // Broadcasting to Celo (Pay)
      const { request: payRequest } = await publicClient.simulateContract({
        account: address,
        address: CONTRACT_ADDRESS,
        abi: MICROMIND_ABI,
        functionName: 'payForPrompt',
        args: [toolId, promptHash],
      });

      const payHash = await walletClient.writeContract(payRequest);
      await publicClient.waitForTransactionReceipt({ hash: payHash });

      setStep(4); // AI is generating
      // Simulating AI generation delay
      await new Promise(r => setTimeout(r, 2000));

      return { txHash: payHash, promptHash };
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { pay, loading, step };
}
