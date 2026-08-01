'use client';

import { useState } from 'react';
import { ExternalLink, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import {
  getOnchainLink,
  ONCHAIN_PLAINTEXT_BYTE_LIMIT,
  ONCHAIN_JOURNAL_PRICE_USDM,
  saveEncryptedJournalOnchain,
  saveOnchainLink,
  utf8ByteLength,
  type OnchainJournalLink,
} from '@/lib/onchainJournal';

export function OnchainJournalDialog({
  open,
  journalId,
  content,
  onClose,
}: {
  open: boolean;
  journalId: string;
  content: string;
  onClose: () => void;
}) {
  const { address, walletClient, isMiniPay } = useWallet();
  const [consented, setConsented] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState<OnchainJournalLink | null>(() => getOnchainLink(journalId));
  const bytes = utf8ByteLength(content);
  const tooLarge = bytes > ONCHAIN_PLAINTEXT_BYTE_LIMIT;

  if (!open) return null;

  const save = async () => {
    if (!address || !walletClient) {
      setError('Connect the wallet that should control access to this journal.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const receipt = await saveEncryptedJournalOnchain({
        content,
        address: address as `0x${string}`,
        walletClient,
        isMiniPay,
      });
      const saved = { ...receipt, savedAt: Date.now() };
      saveOnchainLink(journalId, receipt);
      setLink(saved);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save this entry on-chain.';
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('user rejected') || lowerMessage.includes('rejected the request')) {
        setError('The wallet request was cancelled.');
      } else if (lowerMessage.includes('insufficient funds')) {
        setError('The wallet could not reserve the transaction. Refresh your wallet balance and try again.');
      } else {
        setError('The encrypted entry could not be saved. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-surface border border-border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <LockKeyhole className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-serif text-xl text-text-primary">Encrypted on-chain journal</h2>
              <p className="text-xs font-mono text-text-muted mt-1">Permanent ciphertext on Celo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {link ? (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-accent font-mono text-sm">
              <ShieldCheck className="w-4 h-4" /> Saved permanently
            </div>
            {link.entryId && <p className="text-xs text-text-muted font-mono">On-chain entry #{link.entryId}</p>}
            <a
              href={`https://celoscan.io/tx/${link.transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              View transaction <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <>
            <div className="space-y-3 text-sm text-text-muted leading-relaxed">
              <p>The journal text is encrypted in your browser. Celo receives the encrypted bytes, never the readable text or key.</p>
              <ul className="space-y-2 font-mono text-xs">
                <li>• Permanent: the ciphertext and transaction cannot be deleted.</li>
                <li>• Wallet access: use the same wallet to recreate the decryption key.</li>
                <li>• Public metadata: wallet address, time, size and integrity hash are visible.</li>
                <li>• Text only: images and audio are not included.</li>
                <li>• App fee: {ONCHAIN_JOURNAL_PRICE_USDM} USDm.</li>
              </ul>
            </div>

            <div className={`rounded-xl border p-3 font-mono text-xs ${tooLarge ? 'border-red-500/50 text-red-400' : 'border-border text-text-muted'}`}>
              {bytes.toLocaleString()} / {ONCHAIN_PLAINTEXT_BYTE_LIMIT.toLocaleString()} UTF-8 bytes
              <p className="mt-1 opacity-75">Emojis are allowed but usually use more bytes than letters.</p>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consented}
                onChange={event => setConsented(event.target.checked)}
                className="mt-0.5 accent-current"
              />
              <span className="text-xs text-text-primary leading-relaxed">
                I understand this encrypted record is permanent, losing wallet access may mean losing decryption access, and MicroMind cannot delete or recover it.
              </span>
            </label>

            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

            <button
              onClick={save}
              disabled={!consented || tooLarge || saving}
              className="w-full py-3 rounded-xl bg-accent text-bg font-mono text-xs font-bold disabled:opacity-40"
            >
              {saving ? 'Waiting for wallet and Celo…' : 'Encrypt & save permanently'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
