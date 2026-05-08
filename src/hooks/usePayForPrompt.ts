'use client';

import { useState } from 'react';
import { parseEther } from 'viem';
import { celo, celoSepolia } from 'viem/chains';
import { MICROMIND_ABI } from '@/lib/contract';
import { publicClient } from '@/lib/viem';
import { useWallet } from '@/context/WalletContext';
import { saveToHistory } from '@/lib/storage';
import { TOOLS } from '@/constants/tools';
import { CHAIN_CONFIG, IS_TESTNET } from '@/constants/chains';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export function usePayForPrompt() {
  const { address, walletClient } = useWallet();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string | null>(null);

  const payAndGenerate = async (toolId: number, toolName: string, prompt: string) => {
    if (!address || !walletClient) return;
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) throw new Error('Invalid tool');
    
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
    const celoChain = IS_TESTNET ? celoSepolia : celo;

    try {
      setLoading(true);
      
      // Step 1: Check agent is online
      setStep('checking');
      try {
        const health = await fetch(`${agentUrl}/api/health`, {
          signal: AbortSignal.timeout(5000)
        });
        if (!health.ok) throw new Error('Agent offline');
      } catch {
        throw new Error('AI agent is offline. Run: npm run agent');
      }

      // Step 2: Submit prompt to get hash
      setStep('submitting');
      const submitRes = await fetch(`${agentUrl}/api/prompt/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          toolId,
          userAddress: address
        })
      });
      const { promptHash } = await submitRes.json();

      // Step 3: Pay with native CELO (single transaction, no approve)
      setStep('paying');

      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: MICROMIND_ABI,
        functionName: 'payForPrompt',
        args: [toolId, promptHash as `0x${string}`],
        value: parseEther(tool.price),
        chain: celoChain,
        account: address as `0x${string}`
      });

      setStep('confirming');
      await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        confirmations: 1
      });

      // Step 4: Poll for AI response
      setStep('generating');
      let attempts = 0;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;

        // After 5 failed polls (~10 seconds), try direct processing fallback
        if (attempts === 5) {
          console.log('Trying direct processing fallback...');
          try {
            const directRes = await fetch(`${agentUrl}/api/process-direct`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                txHash, 
                prompt, 
                toolId, 
                userAddress: address 
              })
            }).then(r => r.json());
            
            if (directRes.status === 'ready') {
              saveToHistory({
                id: txHash,
                txHash,
                toolId,
                toolName,
                prompt,
                response: directRes.response,
                cost: tool.priceDisplay,
                timestamp: Date.now()
              });
              setStep('complete');
              return directRes.response;
            }
          } catch (e) {
            console.log('Direct fallback failed, continuing poll...', e);
          }
        }

        try {
          const res = await fetch(`${agentUrl}/api/response/${txHash}`);
          if (!res.ok) continue;
          const data = await res.json();
          
          if (data.status === 'ready') {
            saveToHistory({
              id: txHash,
              txHash,
              toolId,
              toolName,
              prompt,
              response: data.response,
              cost: tool.priceDisplay,
              timestamp: Date.now()
            });
            setStep('complete');
            return data.response;
          }
        } catch { /* continue polling */ }
      }

      throw new Error(
        'Response timed out. Check ' +
        CHAIN_CONFIG.explorer + '/tx/' + txHash
      );
    } catch (error) {
      console.error('Payment/Generation failed:', error);
      setStep('error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { payAndGenerate, loading, step };
}
