import { useState, useCallback } from 'react';
import { erc20Abi, keccak256, toBytes } from 'viem';
import { celo } from 'viem/chains';
import { useWallet } from '@/context/WalletContext';
import { CONTRACT_ADDRESS, MICROMIND_ABI } from '@/lib/contract';
import { USDm_ADDRESS, CELO_MAINNET_PARAMS } from '@/constants/chains';
import { TOOLS } from '@/constants/tools';
import { saveToHistory } from '@/lib/storage';
import { buildRelayRequest, signRelayRequest } from '@/lib/eip712';

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

/** Current Supabase access token, if any — sent so the agent can attribute a prompt_history record to a real account. */
async function getAccessToken(): Promise<string | null> {
  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

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

      // Sent so the agent can attribute the eventual prompt_history record to a real account.
      const accessToken = await getAccessToken();
      const authHeaders: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

      // Notify agent in the background so it can cache the prompt for polling fallback
      if (agentUrl) {
        fetch(`${agentUrl}/api/prompt/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ prompt: finalPrompt, toolId, userAddress: address, nonce }),
        }).catch(() => { /* agent offline — payment still proceeds */ });
      }

      // Read the exact price the contract will pull so the approve amount always matches.
      // Strategy: try getPrice() first (new contract), then fall back to reading the
      // toolPrices(toolId) mapping directly — that is the EXACT storage slot that
      // payForPrompt reads at execution time. Never fall back to a hardcoded constant,
      // because a mismatch between the approved amount and the contract's stored price
      // is the sole cause of "ERC20: insufficient allowance" on payForPrompt.
      let price: bigint;
      try {
        price = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: MICROMIND_ABI,
          functionName: 'getPrice',
          args: [toolId],
        }) as bigint;
      } catch {
        // getPrice() not present in this contract version — read the mapping directly.
        try {
          price = await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: [{ name: 'toolPrices', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint8' }], outputs: [{ name: '', type: 'uint256' }] }] as const,
            functionName: 'toolPrices',
            args: [toolId],
          }) as bigint;
        } catch {
          price = BigInt(0);
        }
      }

      if (price <= BigInt(0)) {
        throw new Error(
          `Could not read the payment amount for this tool from the contract. ` +
          `If this error persists, the contract at ${CONTRACT_ADDRESS} may not be the correct MicroMindPayment deployment. ` +
          `Please contact support.`
        );
      }

      // STEP 1 — Approve USDm transfer
      // We must approve the contract to pull `price` worth of USDm from the user's wallet.
      // MiniPay: CIP-64 feeCurrency so gas is paid in USDm (MiniPay users cannot hold CELO).
      setStep('approving');
      const approveNonce = isMiniPay
        ? await publicClient.getTransactionCount({ address: address as `0x${string}`, blockTag: 'pending' })
        : undefined;

      const approveGas = isMiniPay
        ? await publicClient.estimateContractGas(Object.assign({
            address: USDm_ADDRESS as `0x${string}`,
            abi: erc20Abi,
            functionName: 'approve' as const,
            args: [CONTRACT_ADDRESS as `0x${string}`, price] as const,
            account: address as `0x${string}`,
          }, { feeCurrency: USDm_ADDRESS as `0x${string}` })).catch(() => BigInt(100_000))
        : undefined;

      const approveTx = await walletClient.writeContract(Object.assign({
        address: USDm_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve' as const,
        args: [CONTRACT_ADDRESS as `0x${string}`, price] as const,
        chain: celo,
        account: address as `0x${string}`,
        ...(approveNonce !== undefined ? { nonce: approveNonce } : {}),
        ...(approveGas !== undefined ? { gas: approveGas } : {}),
      }, isMiniPay ? { feeCurrency: USDm_ADDRESS as `0x${string}` } : {}));

      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveTx,
        confirmations: 1,
        timeout: 60_000,
      });

      if (approveReceipt.status !== 'success') {
        throw new Error('USDm approval was rejected by the network. Please try again.');
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
          }, { feeCurrency: USDm_ADDRESS as `0x${string}` })).catch(() => BigInt(200_000))
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
      }, isMiniPay ? { feeCurrency: USDm_ADDRESS as `0x${string}` } : {}));

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
            headers: { 'Content-Type': 'application/json', ...authHeaders },
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
              cost: `${tool.price} USDm`,
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
                cost: `${tool.price} USDm`,
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
                headers: { 'Content-Type': 'application/json', ...authHeaders },
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
        cost: `${tool.price} USDm`,
        timestamp: Date.now()
      });
      setResponse(fallbackMsg);
      setStep('complete');
      return fallbackMsg;

    } catch (e: unknown) {
      console.error('Payment Error:', e);

      const err = e as { shortMessage?: string; message?: string; code?: number };
      let msg = err.shortMessage || err.message || 'Transaction failed';
      const msgL = msg.toLowerCase();

      if (err.code === 4001 || msgL.includes('user rejected') || msgL.includes('rejected the request') || msgL.includes('denied')) {
        msg = 'Transaction cancelled.';
      } else if (msgL.includes('insufficient allowance')) {
        msg = 'Approval step failed — the contract could not move your USDm. Please try again.';
      } else if (isMiniPay && (msgL.includes('insufficient funds') || msgL.includes('insufficient balance'))) {
        msg = 'Not enough USDm for this transaction. You need at least 0.005 USDm.';
      } else if (!isMiniPay && (msgL.includes('insufficient funds') || msgL.includes('insufficient balance'))) {
        msg = 'Not enough USDm or CELO (gas). Top up your wallet and try again.';
      }

      setError(msg);
      setStep('error');
      // No re-throw — hook owns the error state. Pages use step/error from the hook.
    }
  }, [address, walletClient, publicClient, isMiniPay]);

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(null);
    setResponse(null);
  }, []);

  /**
   * payViaRelay — gasless path for MiniPay users.
   *
   * 1. Computes promptHash locally
   * 2. Builds an EIP-712 RelayRequest
   * 3. User signs the typed data (no gas cost — just a signature popup)
   * 4. Sends signature + prompt to POST /api/relay on the agent
   * 5. Backend verifies, executes on-chain using developer CELO wallet, returns AI response
   */
  const payViaRelay = useCallback(async (
    toolId:   number,
    toolName: string,
    prompt:   string,
  ) => {
    if (!address || !walletClient) {
      setError('Wallet not connected');
      return;
    }

    const tool     = TOOLS.find(t => t.id === toolId);
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;

    if (!tool)     { setError('Unknown tool'); setStep('error'); return; }
    if (!agentUrl) { setError('Agent URL not configured'); setStep('error'); return; }

    setError(null);
    setResponse(null);
    setTxHash(null);

    try {
      setStep('submitting');

      let finalPrompt = prompt;
      if (finalPrompt.length > MAX_PROMPT_CHARS) {
        finalPrompt = finalPrompt.slice(0, MAX_PROMPT_CHARS);
      }

      // Build promptHash (same algorithm as backend)
      const nonce      = Date.now().toString();
      const promptHash = keccak256(toBytes(`${finalPrompt}:${address}:${nonce}`)) as `0x${string}`;

      // Build EIP-712 relay request
      const relayRequest = buildRelayRequest(
        toolId,
        promptHash,
        address as `0x${string}`,
      );

      // Ask user to sign typed data — shows structured popup, no gas required
      setStep('approving'); // re-use 'approving' step label for the signing popup
      const signature = await signRelayRequest(
        walletClient as any,
        address as `0x${string}`,
        relayRequest,
      );

      setStep('paying'); // backend is now executing the relay

      // Sent so the agent can attribute the eventual prompt_history record to a real account.
      const accessToken = await getAccessToken();
      const authHeaders: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

      const relayRes = await fetch(`${agentUrl}/api/relay`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          signature,
          toolId,
          promptHash,
          userAddress: address,
          nonce:       relayRequest.nonce.toString(),
          deadline:    relayRequest.deadline.toString(),
          prompt:      finalPrompt,
        }),
      }).then(r => r.json());

      if (relayRes.error) {
        throw new Error(relayRes.error);
      }

      const relayTxHash = relayRes.txHash as string;
      setTxHash(relayTxHash);

      if (relayRes.status === 'ready') {
        // AI response came back immediately
        saveToHistory({
          id:        Math.random().toString(36).substring(7),
          txHash:    relayTxHash,
          toolId,
          toolName,
          prompt,
          response:  relayRes.response,
          cost:      `${tool.price} USDm`,
          timestamp: Date.now(),
        });
        setResponse(relayRes.response);
        setStep('complete');
        return relayRes.response;
      }

      // Status 'processing' — poll for response
      setStep('generating');
      for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        try {
          const data = await fetch(
            `${agentUrl}/api/response/${relayTxHash}`,
            { signal: AbortSignal.timeout(POLL_FETCH_TIMEOUT_MS) },
          ).then(r => r.json());

          if (data.status === 'ready') {
            saveToHistory({
              id:        Math.random().toString(36).substring(7),
              txHash:    relayTxHash,
              toolId,
              toolName,
              prompt,
              response:  data.response,
              cost:      `${tool.price} USDm`,
              timestamp: Date.now(),
            });
            setResponse(data.response);
            setStep('complete');
            return data.response;
          }
        } catch { /* continue polling */ }
      }

      setError('Response timed out. Your payment was processed — try refreshing in a minute.');
      setStep('error');

    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string; code?: number };
      let msg = err.shortMessage || err.message || 'Relay failed';
      if (err.code === 4001 || msg.toLowerCase().includes('user rejected')) {
        msg = 'Signature cancelled.';
        setError(msg);
        setStep('error');
        return;
      }
      console.warn('[RELAY] Relay signature failed. Falling back to direct on-chain payment:', msg);
      return payAndGenerate(toolId, toolName, prompt);
    }
  }, [address, walletClient, payAndGenerate]);

  return { payAndGenerate, payViaRelay, loading, step, error, txHash, response, reset };
}
