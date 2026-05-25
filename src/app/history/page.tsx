"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicClient } from '@/lib/viem';
import { CONTRACT_ADDRESS, MICROMIND_ABI } from '@/lib/contract';
import { getHistory } from '@/lib/storage';

export default function HistoryPage() {
  const [onchain, setOnchain] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = Math.max(0, latest - 20000);
        const eventAbi = MICROMIND_ABI.find(e => (e as any).name === 'PromptPaid') as any;

        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS as `0x${string}`,
          fromBlock,
          toBlock: 'latest',
          event: eventAbi
        } as any);

        // Normalize logs
        const parsed = (logs || []).map((l: any) => ({
          txHash: l.transactionHash || l.transactionHash,
          user: l.args?.user || l.topics?.[1] || null,
          toolId: l.args?.toolId ?? (l.args && l.args[1]) || null,
          promptHash: l.args?.promptHash || null,
          amount: l.args?.amount || null,
          timestamp: l.args?.timestamp || null,
        }));

        if (mounted) setOnchain(parsed.reverse());
      } catch (e) {
        console.error('Failed to load on-chain events', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false };
  }, []);

  const history = getHistory();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif">Activity</h1>
        <Link href="/app">Back</Link>
      </div>

      <section className="mb-8">
        <h2 className="font-mono text-sm text-text-muted mb-3">Local History</h2>
        {history.length === 0 ? (
          <p className="text-text-muted">No local history found.</p>
        ) : (
          <ul className="space-y-3">
            {history.map(h => (
              <li key={h.id} className="p-3 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-semibold">{h.toolName}</div>
                    <div className="text-text-muted text-xs">{new Date(h.timestamp).toLocaleString()}</div>
                  </div>
                  <a target="_blank" rel="noreferrer" href={`https://celoscan.io/tx/${h.txHash}`} className="text-sm text-accent">View on explorer</a>
                </div>
                <div className="mt-2 text-sm text-text-primary">{h.prompt}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-mono text-sm text-text-muted mb-3">On-chain Events</h2>
        {loading ? (
          <div className="text-text-muted">Loading on-chain events...</div>
        ) : onchain.length === 0 ? (
          <div className="text-text-muted">No recent on-chain events found (last ~20k blocks).</div>
        ) : (
          <ul className="space-y-3">
            {onchain.map((e, i) => (
              <li key={e.txHash || i} className="p-3 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-semibold">PromptPaid — tool {String(e.toolId)}</div>
                    <div className="text-text-muted text-xs">{e.user}</div>
                  </div>
                  <a target="_blank" rel="noreferrer" href={`https://celoscan.io/tx/${e.txHash}`} className="text-sm text-accent">View</a>
                </div>
                <div className="mt-2 text-sm text-text-primary">Prompt hash: {String(e.promptHash)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
