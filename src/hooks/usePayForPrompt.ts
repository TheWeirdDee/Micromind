import { useState, useCallback } from 'react';
import { parseUnits, erc20Abi, keccak256, toBytes } from 'viem';
import { celo } from 'viem/chains';
import { useWallet } from '@/context/WalletContext';
import { CONTRACT_ADDRESS, MICROMIND_ABI } from '@/lib/contract';
import { cUSD_ADDRESS, PAYMENT_TOKEN_DECIMALS, CELO_MAINNET_PARAMS } from '@/constants/chains';
import { TOOLS } from '@/constants/tools';
import { saveToHistory } from '@/lib/storage';

/** Maximum characters of the prompt sent to the agent for hash computation. */
const MAX_PROMPT_CHARS = 500;

/** Milliseconds between each polling attempt for the AI response. */
const POLL_INTERVAL_MS = 2_000;

/** Maximum number of polling attempts before declaring a timeout. */
const MAX_POLL_ATTEMPTS = 60;

/** Abort timeout for the fast-path /api/process-direct request. */
const DIRECT_FETCH_TIMEOUT_MS = 30_000;

/** Abort timeout for each individual /api/response poll request. */
const POLL_FETCH_TIMEOUT_MS = 5_000;

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
    chatHistory?: { role: string; content: string }[]
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
      // MiniPay is always on Celo — skip the chain switch entirely.
      // Non-MiniPay wallets (MetaMask, etc.) need the explicit switch.
      setStep('checking');
      if (!isMiniPay) {
        try {
          await walletClient.switchChain({ id: 42220 });
        } catch (switchErr: unknown) {
          const switchCode = (switchErr as { code?: number }).code;
          if (switchCode === 4902 || switchCode === -32603) {
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
      }

      setStep('submitting');
      let finalPrompt = chatHistory ? JSON.stringify(chatHistory) : prompt;
      if (finalPrompt.length > MAX_PROMPT_CHARS) {
        finalPrompt = finalPrompt.slice(0, MAX_PROMPT_CHARS);
      }

      // Compute hash locally — matches agent logic exactly, no server roundtrip needed
      const nonce = Date.now().toString();
      const promptHash = keccak256(toBytes(`${finalPrompt}:${address}:${nonce}`));

      // Notify agent in the background so it can cache the prompt for polling fallback
      if (agentUrl) {
        fetch(`${agentUrl}/api/prompt/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: finalPrompt, toolId, userAddress: address, nonce }),
        }).catch(() => { /* agent offline — payment still proceeds */ });
      }

      const price = parseUnits(tool.price, PAYMENT_TOKEN_DECIMALS);

      if (price <= BigInt(0)) {
        throw new Error('Invalid payment amount: Price must be greater than zero.');
      }

      // STEP 1 — Approve cUSD transfer
      // We must approve the contract to pull `price` worth of cUSD from the user's wallet.
      // MiniPay: explicit nonce + feeCurrency (pay gas in cUSD, CIP-64 transaction type).
      setStep('approving');
      const approveNonce = isMiniPay
        ? await publicClient.getTransactionCount({ address: address as `0x${string}`, blockTag: 'pending' })
        : undefined;

      // MiniPay CIP-64 transactions sometimes need an explicit gas limit — estimate it.
      const approveGas = isMiniPay
        ? await publicClient.estimateContractGas(Object.assign({
            address: cUSD_ADDRESS as `0x${string}`,
            abi: erc20Abi,
            functionName: 'approve' as const,
            args: [CONTRACT_ADDRESS as `0x${string}`, price] as const,
            account: address as `0x${string}`,
          }, { feeCurrency: cUSD_ADDRESS as `0x${string}` })).catch(() => BigInt(100_000))
        : undefined;

      const approveTx = await walletClient.writeContract(Object.assign({
        address: cUSD_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve' as const,
        args: [CONTRACT_ADDRESS as `0x${string}`, price] as const,
        chain: celo,
        account: address as `0x${string}`,
        ...(approveNonce !== undefined ? { nonce: approveNonce } : {}),
        ...(approveGas !== undefined ? { gas: approveGas } : {}),
      }, isMiniPay ? { feeCurrency: cUSD_ADDRESS as `0x${string}` } : {}));

      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveTx,
        confirmations: 1,
        timeout: 60_000,
      });

      if (approveReceipt.status !== 'success') {
        throw new Error('cUSD approval was rejected by the network. Please try again.');
      }

      // STEP 2 — Submit payment to contract
      // Calls payForPrompt(toolId, promptHash) on the smart contract.
      // The contract emits a PromptPaid event that the agent listens for.
      setStep('paying');
      const payNonce = isMiniPay
        ? await publicClient.getTransactionCount({ address: address as `0x${string}`, blockTag: 'pending' })
        : undefined;

      const payGas = isMiniPay
        ? await publicClient.estimateContractGas(Object.assign({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: MICROMIND_ABI,
            functionName: 'payForPrompt' as const,
            args: [toolId, promptHash as `0x${string}`] as const,
            account: address as `0x${string}`,
          }, { feeCurrency: cUSD_ADDRESS as `0x${string}` })).catch(() => BigInt(200_000))
        : undefined;

      const payTx = await walletClient.writeContract(Object.assign({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: MICROMIND_ABI,
        functionName: 'payForPrompt' as const,
        args: [toolId, promptHash as `0x${string}`] as const,
        chain: celo,
        account: address as `0x${string}`,
        ...(payNonce !== undefined ? { nonce: payNonce } : {}),
        ...(payGas !== undefined ? { gas: payGas } : {}),
      }, isMiniPay ? { feeCurrency: cUSD_ADDRESS as `0x${string}` } : {}));

      // STEP 3 — Wait for on-chain confirmation
      setStep('confirming');
      await publicClient.waitForTransactionReceipt({
        hash: payTx,
        confirmations: 1,
        timeout: 60_000,
      });

      setTxHash(payTx);

      // Notify any interested listeners (e.g. analytics, UI badges) that a payment succeeded
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('micromind:paid', { detail: { txHash: payTx, toolId, toolName } }));
      }

      // STEP 4 — Fetch AI response from agent
      // Try direct /api/process-direct first (fastest path, ~5s).
      // Falls back to polling /api/response/:txHash every POLL_INTERVAL_MS.
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
            signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS)
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
        for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
          try {
            const data = await fetch(
              `${agentUrl}/api/response/${payTx}`,
              { signal: AbortSignal.timeout(POLL_FETCH_TIMEOUT_MS) }
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

            if (data.status === 'prompt_not_found') {
              console.log('[POLL] Agent reports prompt not found. Resubmitting...');
              await fetch(`${agentUrl}/api/prompt/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: finalPrompt, toolId, userAddress: address, nonce }),
              }).catch(() => { /* ignore error, retry on next poll */ });
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

    } catch (e: unknown) {
      console.error('Payment Error:', e);

      const err = e as { shortMessage?: string; message?: string; code?: number };
      let msg = err.shortMessage || err.message || 'Transaction failed';

      if (err.code === 4001 || msg.includes('rejected') || msg.includes('denied')) {
        msg = 'Transaction cancelled.';
      } else if (isMiniPay && (msg.includes('insufficient') || msg.includes('funds') || msg.includes('gas'))) {
        msg = 'Not enough cUSD for this transaction. You need at least 0.005 cUSD.';
      } else if (!isMiniPay && msg.includes('insufficient')) {
        msg = 'Not enough cUSD or CELO (gas). Top up your wallet and try again.';
      }

      setError(msg);
      setStep('error');
      throw e;
    }
  }, [address, walletClient, publicClient, isMiniPay]);

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(null);
    setResponse(null);
  }, []);

  return { payAndGenerate, loading, step, error, txHash, response, reset };
}
