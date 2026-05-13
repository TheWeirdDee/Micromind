import { useState, useCallback } from 'react';
import { parseUnits, erc20Abi } from 'viem';
import { celo } from 'viem/chains';
import { useWallet } from '@/context/WalletContext';
import { CONTRACT_ADDRESS, MICROMIND_ABI } from '@/lib/contract';
import { cUSD_ADDRESS, PAYMENT_TOKEN_DECIMALS } from '@/constants/chains';
import { TOOLS } from '@/constants/tools';
import { saveToHistory } from '@/lib/storage';

export type PaymentStep =
  | 'idle'
  | 'checking'
  | 'submitting'
  | 'approving'
  | 'paying'
  | 'confirming'
  | 'generating'
  | 'complete'
  | 'error';

export function usePayForPrompt() {
  const { address, walletClient, publicClient } = useWallet();
  const [step, setStep] = useState<PaymentStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);

  const loading = step !== 'idle' && step !== 'complete' && step !== 'error';

  const payAndGenerate = useCallback(async (
    toolId: number,
    toolName: string,
    prompt: string,
    chatHistory?: any[]
  ) => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return;
    }

    const tool = TOOLS[toolId];
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;

    if (!agentUrl) {
      setError('Agent URL not configured');
      return;
    }

    setError(null);
    setResponse(null);
    setTxHash(null);

    try {
      // STEP 1 — Check agent health
      setStep('checking');
      try {
        const health = await fetch(`${agentUrl}/api/health`, {
          signal: AbortSignal.timeout(5000)
        });
        if (!health.ok) throw new Error('Agent offline');
      } catch {
        throw new Error(
          'AI agent is offline. Contact support or try again.'
        );
      }

      // STEP 2 — Submit prompt, get hash
      setStep('submitting');
      const finalPrompt = chatHistory ? JSON.stringify(chatHistory) : prompt;
      
      const submitRes = await fetch(`${agentUrl}/api/prompt/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: finalPrompt, 
          toolId, 
          userAddress: address 
        })
      });

      if (!submitRes.ok) throw new Error('Failed to submit prompt');
      const { promptHash } = await submitRes.json();

      // Get current gas price (legacy tx for MiniPay)
      const gasPrice = await publicClient.getGasPrice();

      // STEP 3 — Approve USDC
      setStep('approving');
      const price = parseUnits(tool.price, PAYMENT_TOKEN_DECIMALS);

      const approveNonce = await publicClient.getTransactionCount({
        address: address as `0x${string}`,
        blockTag: 'pending'
      });

      const approveTx = await walletClient.writeContract({
        address: cUSD_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS as `0x${string}`, price],
        chain: celo,
        account: address as `0x${string}`,
        gasPrice,
        nonce: approveNonce,
      });

      await publicClient.waitForTransactionReceipt({
        hash: approveTx,
        confirmations: 1
      });

      // STEP 4 — Pay for prompt
      setStep('paying');
      const payNonce = await publicClient.getTransactionCount({
        address: address as `0x${string}`,
        blockTag: 'pending'
      });

      const payTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: MICROMIND_ABI,
        functionName: 'payForPrompt',
        args: [toolId, promptHash as `0x${string}`],
        chain: celo,
        account: address as `0x${string}`,
        gasPrice,
        nonce: payNonce,
      });

      setStep('confirming');
      await publicClient.waitForTransactionReceipt({
        hash: payTx,
        confirmations: 1
      });

      setTxHash(payTx);

      // STEP 5 — Get AI response
      setStep('generating');

      // Try direct processing first (faster)
      try {
        const directRes = await fetch(`${agentUrl}/api/process-direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash: payTx,
            prompt: finalPrompt,
            toolId,
            userAddress: address
          })
        }).then(r => r.json());

        if (directRes.status === 'ready') {
          saveToHistory({
            id: Math.random().toString(36).substring(7),
            txHash: payTx,
            toolId,
            toolName,
            prompt,
            response: directRes.response,
            cost: tool.priceDisplay,
            timestamp: Date.now()
          });
          setResponse(directRes.response);
          setStep('complete');
          return directRes.response;
        }
      } catch { /* fallback to polling */ }

      // Poll for response
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const data = await fetch(
            `${agentUrl}/api/response/${payTx}`
          ).then(r => r.json());

          if (data.status === 'ready') {
            saveToHistory({
              id: Math.random().toString(36).substring(7),
              txHash: payTx,
              toolId,
              toolName,
              prompt,
              response: data.response,
              cost: tool.priceDisplay,
              timestamp: Date.now()
            });
            setResponse(data.response);
            setStep('complete');
            return data.response;
          }
        } catch { /* continue polling */ }
      }

      throw new Error(
        `Response timed out. Payment confirmed. ` +
        `Check: https://celoscan.io/tx/${payTx}`
      );

    } catch (e: any) {
      console.error('Payment Error:', e);
      
      let msg = e?.shortMessage || e?.message || 'Transaction failed';
      
      // Handle user rejection specifically
      if (e?.code === 4001 || msg.includes('rejected') || msg.includes('denied')) {
        msg = 'Transaction cancelled by user.';
      }

      setError(msg);
      setStep('error');
      throw e;
    }
  }, [address, walletClient, publicClient]);

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(null);
    setResponse(null);
  }, []);

  return { payAndGenerate, loading, step, error, txHash, response, reset };
}
