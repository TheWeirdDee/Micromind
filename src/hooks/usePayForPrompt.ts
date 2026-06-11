import { useState, useCallback } from 'react';
import { parseUnits, erc20Abi, keccak256, toBytes } from 'viem';
import { celo } from 'viem/chains';
import { useWallet } from '@/context/WalletContext';
import { CONTRACT_ADDRESS, MICROMIND_ABI } from '@/lib/contract';
import { cUSD_ADDRESS, PAYMENT_TOKEN_DECIMALS, CELO_MAINNET_PARAMS, CHAIN_ID_HEX } from '@/constants/chains';
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
  const { address, walletClient, publicClient, isMiniPay } = useWallet();
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

    const tool = TOOLS.find(t => t.id === toolId);
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;

    if (!tool) {
      setError('Unknown tool');
      setStep('error');
      return;
    }

    if (!agentUrl) {
      setError('Agent URL not configured');
      return;
    }

    setError(null);
    setResponse(null);
    setTxHash(null);

    try {
      // Ensure wallet is on Celo before any transaction
      setStep('checking');
      try {
        await walletClient.switchChain({ id: 42220 });
      } catch (switchErr: any) {
        if (switchErr.code === 4902 || switchErr.code === -32603) {
          try {
            await walletClient.request({
              method: 'wallet_addEthereumChain',
              params: [CELO_MAINNET_PARAMS],
            });
            await walletClient.switchChain({ id: 42220 });
          } catch {
            throw new Error('Failed to add Celo network to your wallet.');
          }
        } else {
          throw new Error('Please switch your wallet to the Celo network to proceed.');
        }
      }

      setStep('submitting');
      const finalPrompt = chatHistory ? JSON.stringify(chatHistory) : prompt;

      // Compute hash locally — matches agent logic exactly, no server roundtrip needed
      const nonce = Date.now().toString();
      const promptHash = keccak256(toBytes(`${finalPrompt}:${address}:${nonce}`));

      // Notify agent in the background so it can cache the prompt for polling fallback
      if (agentUrl) {
        fetch(`${agentUrl}/api/prompt/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: finalPrompt, toolId, userAddress: address }),
        }).catch(() => { /* agent offline — payment still proceeds */ });
      }

      // Get current gas price (legacy tx for MiniPay)
      const gasPrice = await publicClient.getGasPrice();
      const price = parseUnits(tool.price, PAYMENT_TOKEN_DECIMALS);

      // STEP 4 — Approve cUSD
      setStep('approving');
      // MiniPay requires explicit nonce; MetaMask manages its own — don't override it
      const approveNonce = isMiniPay
        ? await publicClient.getTransactionCount({ address: address as `0x${string}`, blockTag: 'pending' })
        : undefined;

      const approveTx = await walletClient.writeContract({
        address: cUSD_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS as `0x${string}`, price],
        chain: celo,
        account: address as `0x${string}`,
        gasPrice,
        ...(approveNonce !== undefined ? { nonce: approveNonce } : {}),
        feeCurrency: isMiniPay ? (cUSD_ADDRESS as `0x${string}`) : undefined,
      });

      await publicClient.waitForTransactionReceipt({
        hash: approveTx,
        confirmations: 1
      });

      // STEP 5 — Pay for prompt (cUSD)
      setStep('paying');
      const payNonce = isMiniPay
        ? await publicClient.getTransactionCount({ address: address as `0x${string}`, blockTag: 'pending' })
        : undefined;

      const payTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: MICROMIND_ABI,
        functionName: 'payForPrompt',
        args: [toolId, promptHash as `0x${string}`],
        chain: celo,
        account: address as `0x${string}`,
        gasPrice,
        ...(payNonce !== undefined ? { nonce: payNonce } : {}),
        feeCurrency: isMiniPay ? (cUSD_ADDRESS as `0x${string}`) : undefined,
      });

      setStep('confirming');
      await publicClient.waitForTransactionReceipt({
        hash: payTx,
        confirmations: 1
      });

      setTxHash(payTx);

      // STEP 5 — Get AI response
      setStep('generating');

      if (agentUrl) {
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
            }),
            signal: AbortSignal.timeout(30_000)
          }).then(r => r.json());

          if (directRes.status === 'ready') {
            saveToHistory({
              id: Math.random().toString(36).substring(7),
              txHash: payTx,
              toolId,
              toolName,
              prompt,
              response: directRes.response,
              cost: `${tool.price} cUSD`,
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
              `${agentUrl}/api/response/${payTx}`,
              { signal: AbortSignal.timeout(5000) }
            ).then(r => r.json());

            if (data.status === 'ready') {
              saveToHistory({
                id: Math.random().toString(36).substring(7),
                txHash: payTx,
                toolId,
                toolName,
                prompt,
                response: data.response,
                cost: `${tool.price} cUSD`,
                timestamp: Date.now()
              });
              setResponse(data.response);
              setStep('complete');
              return data.response;
            }
          } catch { /* continue polling */ }
        }
      }

      // Agent offline or timed out — payment still went through
      const fallbackMsg = `Payment confirmed (tx: ${payTx.slice(0, 10)}…). AI agent is offline — your response will appear once it's back online. Check celoscan.io/tx/${payTx}`;
      saveToHistory({
        id: Math.random().toString(36).substring(7),
        txHash: payTx,
        toolId,
        toolName,
        prompt,
        response: fallbackMsg,
        cost: `${tool.price} cUSD`,
        timestamp: Date.now()
      });
      setResponse(fallbackMsg);
      setStep('complete');
      return fallbackMsg;

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
