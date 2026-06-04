'use client';

import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { parseEther } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';
import { ArrowUp, Send, CheckCircle2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SendPage() {
  const { address, celoBalance, walletClient, isConnected } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

  const handleSend = async () => {
    if (!walletClient || !address || !recipient || !amount) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const hash = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        to: recipient as `0x${string}`,
        value: parseEther(amount),
        chain: IS_TESTNET ? celoAlfajores : celo,
      });

      setTxHash(hash);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('0x')) {
        setRecipient(text);
      }
    } catch (err) {
      console.error('Failed to read clipboard');
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-text-muted font-mono text-sm">Please connect your wallet to send CELO.</p>
      </div>
    );
  }

  if (txHash) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="bg-accent-green/10 p-6 rounded-full mb-8">
          <CheckCircle2 className="w-12 h-12 text-accent-green" />
        </div>
        <h2 className="text-3xl font-serif mb-4">Transfer Sent!</h2>
        <p className="text-text-muted font-mono text-sm mb-8 max-w-xs">
          Your CELO is on its way. You can track it on Celoscan below.
        </p>
        
        <div className="space-y-4 w-full max-w-xs">
          <a 
            href={`${IS_TESTNET ? 'https://alfajores.celoscan.io' : 'https://celoscan.io'}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full pill-button-primary flex items-center justify-center gap-2"
          >
            View on Celoscan <ExternalLink className="w-4 h-4" />
          </a>
          <button 
            onClick={() => setTxHash(null)}
            className="w-full text-text-muted font-mono text-[10px] uppercase tracking-widest pt-4"
          >
            Send Another
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-up">
      <header>
        <h2 className="text-4xl font-serif mb-2 tracking-tight">Send CELO</h2>
        <p className="text-text-muted font-mono text-sm">Transfer assets to any address.</p>
      </header>

      <div className="space-y-8 bg-surface border border-border p-8 rounded-[2rem]">
        <div className="space-y-4">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Recipient Address
          </label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-accent transition-colors"
            />
            <button 
              onClick={handlePaste}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-accent uppercase tracking-widest hover:text-white transition-colors"
            >
              Paste
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="block font-mono text-[10px] uppercase tracking-widest text-text-muted">
              Amount (CELO)
            </label>
            <span className="font-mono text-[10px] text-text-muted">
              Balance: <span className="text-text-primary">{celoBalance} CELO</span>
            </span>
          </div>
          <input 
            type="number" 
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-500 font-mono text-[10px] text-center">
            {error}
          </p>
        )}

        <button 
          onClick={handleSend}
          disabled={loading || !recipient || !amount}
          className="w-full pill-button pill-button-primary disabled:opacity-30 disabled:cursor-not-allowed group h-14"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              Send Assets <ArrowUp className="w-4 h-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
