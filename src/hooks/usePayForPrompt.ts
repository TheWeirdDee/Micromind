'use client';

import { useState } from 'react';
import { parseUnits, erc20Abi } from 'viem';
import { celo } from 'viem/chains';
import { MICROMIND_ABI } from '@/lib/contract';
import { publicClient } from '@/lib/viem';
import { useWallet } from '@/context/WalletContext';
import { saveToHistory } from '@/lib/storage';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const CUSD_ADDRESS = process.env.NEXT_PUBLIC_CUSD_ADDRESS;
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_API_URL;

const TOOL_PRICES: Record<number, string> = {
  0: '0.01',
  1: '0.05',
  2: '0.01',
  3: '0.02'
};

export function usePayForPrompt() {
  const { address, walletClient } = useWallet();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string | null>(null);

  const payAndGenerate = async (toolId: number, toolName: string, prompt: string) => {
    if (!address || !walletClient) return;

    try {
      setLoading(true);
      setStep('SUBMITTING');

      // Step 1: Submit prompt to get hash
      const submitRes = await fetch(`${AGENT_URL}/api/prompt/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          toolId,
          userAddress: address 
        })
      });
      const { promptHash } = await submitRes.json();

      setStep('APPROVING');
      // Step 2: Approve cUSD spend (using 0.05 to cover any tool)
      const approveTx = await walletClient.writeContract({
        account: address as `0x${string}`,
        address: CUSD_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS as `0x${string}`, parseUnits('0.05', 18)],
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      setStep('PAYING');
      // Step 3: Pay on-chain
      const payTx = await walletClient.writeContract({
        account: address as `0x${string}`,
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: MICROMIND_ABI,
        functionName: 'payForPrompt',
        args: [toolId, promptHash as `0x${string}`],
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash: payTx });

      setStep('POLLING');
      // Step 4: Poll for AI response (max 60 seconds)
      let attempts = 0;
      while (attempts < 30) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await fetch(`${AGENT_URL}/api/response/${payTx}`);
        const data = await res.json();
        
        if (data.status === 'ready') {
          // Save to localStorage history
          saveToHistory({ 
            id: payTx,
            txHash: payTx, 
            prompt, 
            response: data.response,
            toolId, 
            toolName,
            cost: TOOL_PRICES[toolId],
            timestamp: Date.now()
          });
          setStep('COMPLETE');
          return data.response;
        }
        attempts++;
      }
      throw new Error('Response timed out. Check Celoscan for your transaction.');
    } catch (error) {
      console.error('Payment/Generation failed:', error);
      setStep('ERROR');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { payAndGenerate, loading, step };
}
