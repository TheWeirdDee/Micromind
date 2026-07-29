'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Mail, Sparkles, CheckCircle2, AlertTriangle, Star, X, Calendar, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';
import { AgentWarning } from '@/components/app/AgentWarning';
import { ConfirmDialog } from '@/components/app/ConfirmDialog';
import { getHistory, saveToHistory } from '@/lib/storage';
import { updateStreak } from '@/lib/journal';
import { generateEncryptionKey, encryptText, decryptText } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ConnectWalletModal = dynamic(
  () => import('@/components/app/ConnectWalletModal').then((m) => m.ConnectWalletModal),
  { ssr: false }
);

type Contact = { name: string; email: string };
const CONTACTS_KEY = 'mm_starred_contacts';

function loadContacts(): Contact[] {
  try {
    return JSON.parse(localStorage.getItem(CONTACTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveContacts(contacts: Contact[]) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

interface ScheduledLetter {
  id: string;
  recipient_email: string;
  sender_name: string;
  release_date: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  created_at: string;
}

const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;

/** Local datetime-local string for "now", used as the min attribute so past dates can't be picked. */
function nowForInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function LetterPageInner({ historyId, contentParam }: { historyId: string | null; contentParam: string | null }) {
  const { isConnected, address, celoBalance, isMiniPay } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [starredContacts, setStarredContacts] = useState<Contact[]>(() =>
    typeof window !== 'undefined' ? loadContacts() : []
  );

  const [activeTab, setActiveTab] = useState<'instant' | 'schedule'>('instant');

  const [dbUser, setDbUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [scheduledLetters, setScheduledLetters] = useState<ScheduledLetter[]>([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [initialData] = useState(() => {
    if (!historyId || typeof window === 'undefined') return null;
    const hist = getHistory();
    const item = hist.find(h => h.txHash === historyId);
    if (!item || item.toolId !== 5) return null;
    try {
      const parsed = JSON.parse(item.prompt) as { content?: string; recipientEmail?: string; senderName?: string };
      return { content: parsed.content ?? '', recipientEmail: parsed.recipientEmail ?? '', senderName: parsed.senderName ?? '', polishedResponse: item.response };
    } catch {
      return { content: item.prompt, recipientEmail: '', senderName: '', polishedResponse: item.response };
    }
  });

  const [recipientEmail, setRecipientEmail] = useState(initialData?.recipientEmail ?? '');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState(initialData?.senderName ?? '');
  const [content, setContent] = useState(initialData?.content ?? contentParam ?? '');
  
  const [releaseDate, setReleaseDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    return tomorrow.toISOString().slice(0, 16);
  });

  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [polishedResponse, setPolishedResponse] = useState<string | null>(initialData?.polishedResponse ?? null);

  const { payAndGenerate, payViaRelay, loading: paidLoading, step: paidStep } = usePayForPrompt();

  const hasNoCelo = isConnected && !isMiniPay && Number(celoBalance) < 0.0005;
  const isFormValid = recipientEmail.includes('@') && senderName.trim().length > 0 && content.trim().length >= 5;
  const isReleaseDateValid = new Date(releaseDate).getTime() > Date.now();

  const isCurrentStarred = starredContacts.some(
    c => c.email === recipientEmail.trim() && c.name === recipientName.trim()
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setDbUser(session?.user ?? null);
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setDbUser(session?.user ?? null);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchScheduledLetters = async () => {
    setLoadingLetters(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_letters')
        .select('id, recipient_email, sender_name, release_date, status, created_at')
        .order('release_date', { ascending: true });

      if (error) throw error;
      setScheduledLetters(data || []);
    } catch (e) {
      console.error('[FETCH SCHEDULED LETTERS ERROR]', e);
    } finally {
      setLoadingLetters(false);
    }
  };

  useEffect(() => {
    if (dbUser) {
      const timer = setTimeout(() => {
        fetchScheduledLetters();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setScheduledLetters([]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [dbUser]);

  const toggleStar = () => {
    const email = recipientEmail.trim();
    const name = recipientName.trim();
    if (!email.includes('@') || !name) return;

    const updated = isCurrentStarred
      ? starredContacts.filter(c => !(c.email === email && c.name === name))
      : [...starredContacts, { email, name }];

    setStarredContacts(updated);
    saveContacts(updated);
  };

  const removeContact = (contact: Contact) => {
    const updated = starredContacts.filter(c => !(c.email === contact.email && c.name === contact.name));
    setStarredContacts(updated);
    saveContacts(updated);
  };

  const applyContact = (contact: Contact) => {
    setRecipientEmail(contact.email);
    setRecipientName(contact.name);
  };

  const handleFreeSend = async () => {
    if (!isFormValid || sending || paidLoading) return;
    if (!session?.access_token) {
      alert('Please log in to send a letter.');
      return;
    }
    setSending(true);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/letter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          content: content.trim(),
          recipientEmail: recipientEmail.trim(),
          senderName: senderName.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send email');
      }

      setSuccessMsg(`Letter sent instantly to ${recipientEmail}!`);
      saveToHistory({
        id: Math.random().toString(36).slice(2),
        toolId: 5,
        toolName: 'Letter',
        prompt: JSON.stringify({ content: content.trim(), recipientEmail: recipientEmail.trim(), senderName: senderName.trim() }),
        response: `Letter sent to ${recipientEmail.trim()}`,
        cost: 'Free',
        txHash: `free_${Date.now()}`,
        timestamp: Date.now(),
      });
      setContent('');
    } catch (e) {
      alert(`Failed to send letter: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  // AI Polish — polishes the text and puts it back in the box for review.
  // Does NOT send on its own; the user reviews/edits, then sends explicitly
  // via the regular Send Letter button, same as any other draft.
  const handlePaidPolish = async () => {
    if (!isFormValid || sending || paidLoading) return;
    setSuccessMsg(null);

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    try {
      // Sent as raw text (not JSON-wrapped with recipientEmail/senderName) so the
      // agent only polishes and does not also send the email as a side effect.
      const aiResponse = isMiniPay
        ? await payViaRelay(5, 'Letter', content.trim())
        : await payAndGenerate(5, 'Letter', content.trim());

      if (aiResponse) {
        setContent(aiResponse);
        updateStreak();
        setSuccessMsg('Polished! Review it below and click Send when ready.');
      }
    } catch (err: unknown) {
      console.error(err);
      alert('Transaction failed. Check your wallet balance and connection.');
    }
  };

  const handleScheduleSend = async (polishedText?: string) => {
    if (!dbUser) {
      alert('Please log in with Supabase to escrow scheduled letters.');
      return;
    }
    if (!isFormValid || sending || paidLoading) return;
    if (!isReleaseDateValid) {
      alert('Please pick a release date in the future.');
      return;
    }

    setSending(true);
    setSuccessMsg(null);

    try {
      const textToEncrypt = polishedText || content.trim();

      // A fresh key is generated on every schedule AND every edit — an edit
      // never reuses the previous ciphertext's key.
      const key = await generateEncryptionKey();
      const payload = await encryptText(textToEncrypt, key);

      if (editingLetterId) {
        const { error } = await supabase
          .from('scheduled_letters')
          .update({
            recipient_email: recipientEmail.trim(),
            sender_name: senderName.trim(),
            ciphertext: payload.ciphertext,
            iv: payload.iv,
            key_hex: key,
            release_date: new Date(releaseDate).toISOString(),
          })
          .eq('id', editingLetterId);

        if (error) throw error;
        setSuccessMsg(`Letter updated — now releasing on ${new Date(releaseDate).toLocaleDateString()}!`);
        setEditingLetterId(null);
      } else {
        const { error } = await supabase.from('scheduled_letters').insert({
          user_id: dbUser.id,
          recipient_email: recipientEmail.trim(),
          sender_name: senderName.trim(),
          ciphertext: payload.ciphertext,
          iv: payload.iv,
          key_hex: key,
          release_date: new Date(releaseDate).toISOString(),
          status: 'pending',
        });

        if (error) throw error;
        setSuccessMsg(`Letter scheduled successfully for delivery on ${new Date(releaseDate).toLocaleDateString()}!`);
      }

      setContent('');
      fetchScheduledLetters();
    } catch (e) {
      alert(`Scheduling failed: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  const handleEditLetter = async (id: string) => {
    if (!dbUser) return;
    try {
      const { data, error } = await supabase
        .from('scheduled_letters')
        .select('id, recipient_email, sender_name, ciphertext, iv, key_hex, release_date, status')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data.status !== 'pending') {
        alert('Only pending letters can be edited.');
        return;
      }

      const plaintext = await decryptText(data.ciphertext, data.iv, data.key_hex);
      setRecipientEmail(data.recipient_email);
      setSenderName(data.sender_name);
      setContent(plaintext);
      const d = new Date(data.release_date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setReleaseDate(d.toISOString().slice(0, 16));
      setEditingLetterId(id);
      setActiveTab('schedule');
      setSuccessMsg(null);
    } catch (e) {
      alert(`Failed to load letter for editing: ${(e as Error).message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingLetterId(null);
    setContent('');
    setRecipientEmail('');
    setSenderName('');
  };

  const handleRetryLetter = async (id: string) => {
    if (!session?.access_token) return;
    setRetryingId(id);
    try {
      const res = await fetch(`${agentUrl}/api/letter/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ letterId: id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Retry failed');
      fetchScheduledLetters();
    } catch (e) {
      alert(`Failed to retry: ${(e as Error).message}`);
    } finally {
      setRetryingId(null);
    }
  };

  // AI Polish (schedule tab) — same principle as the instant tab: polishes the
  // text and puts it back in the box for review. Does not auto-schedule; the
  // user reviews/edits, then clicks Schedule Letter themselves when ready.
  const handleSchedulePolish = async () => {
    if (!dbUser) {
      alert('Please log in with Supabase to escrow scheduled letters.');
      return;
    }
    if (!isFormValid || sending || paidLoading) return;
    setSuccessMsg(null);

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    try {
      // Sent as raw text so the agent only polishes and doesn't also
      // instant-send an email as a side effect.
      const aiResponse = isMiniPay
        ? await payViaRelay(5, 'Letter', content.trim())
        : await payAndGenerate(5, 'Letter', content.trim());

      if (aiResponse) {
        setContent(aiResponse);
        updateStreak();
        setSuccessMsg('Polished! Review it below and click Schedule when ready.');
      }
    } catch (err: unknown) {
      console.error(err);
      alert('AI Polish failed. Verify wallet network and balance.');
    }
  };

  const [cancelEscrowId, setCancelEscrowId] = useState<string | null>(null);

  const handleCancelEscrow = (id: string) => {
    setCancelEscrowId(id);
  };

  const confirmCancelEscrow = async () => {
    if (!cancelEscrowId) return;
    try {
      const { error } = await supabase
        .from('scheduled_letters')
        .delete()
        .eq('id', cancelEscrowId);

      if (error) throw error;
      fetchScheduledLetters();
    } catch (e) {
      alert(`Failed to cancel: ${(e as Error).message}`);
    } finally {
      setCancelEscrowId(null);
    }
  };

  const getStepMessage = () => {
    switch (paidStep) {
      case 'checking':    return 'Checking agent...';
      case 'submitting':  return 'Preparing prompt...';
      case 'approving':   return 'Approving USDm...';
      case 'paying':      return 'Sending payment...';
      case 'confirming':  return 'Confirming on Celo...';
      case 'generating':  return 'AI is polishing...';
      case 'complete':    return 'Processed!';
      default:            return 'Processing...';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-24"
    >
      <AgentWarning />

      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-serif">Letters from the Past</h2>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab('instant'); setSuccessMsg(null); }}
          className={`px-6 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'instant'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Send Instant
        </button>
        <button
          onClick={() => { setActiveTab('schedule'); setSuccessMsg(null); }}
          className={`px-6 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'schedule'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Schedule Escrow
        </button>
      </div>

      {hasNoCelo && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/60 text-xs text-red-200 font-mono leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>This wallet needs a small amount of CELO for gas fees (~0.001 CELO per prompt). Open MicroMind inside the MiniPay app instead for a fully gasless experience — no CELO required there.</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-surface border border-border p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />

        <div className="space-y-6 relative z-10">

          {/* Starred Contacts */}
          {starredContacts.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-1">Starred Contacts</p>
              <div className="flex flex-wrap gap-2">
                {starredContacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-1 group">
                    <button
                      onClick={() => applyContact(c)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border rounded-full text-xs font-mono text-text-muted hover:border-accent-gold/50 hover:text-text-primary transition-all"
                    >
                      <Star className="w-3 h-3 text-accent-gold fill-accent-gold" />
                      {c.name}
                    </button>
                    <button
                      onClick={() => removeContact(c)}
                      className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-text-muted hover:text-red-400 transition-all"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="friend@example.com"
                disabled={sending || paidLoading}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-sm focus:border-accent outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Recipient Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="Friend's Name"
                  disabled={sending || paidLoading}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-sm focus:border-accent outline-none transition-colors"
                />
                <button
                  onClick={toggleStar}
                  disabled={!recipientEmail.includes('@') || !recipientName.trim()}
                  title={isCurrentStarred ? 'Remove from starred' : 'Star this contact'}
                  className={`px-3 rounded-xl border transition-all disabled:opacity-30 ${
                    isCurrentStarred
                      ? 'border-accent-gold/60 bg-accent-gold/10 text-accent-gold'
                      : 'border-border text-text-muted hover:border-accent-gold/40 hover:text-accent-gold'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isCurrentStarred ? 'fill-accent-gold' : ''}`} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Your Name</label>
              <input
                type="text"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="Your Name"
                disabled={sending || paidLoading}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-sm focus:border-accent outline-none transition-colors"
              />
            </div>
          </div>

          {/* Schedule Date (Only show under schedule tab) */}
          {activeTab === 'schedule' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4"
            >
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>Release Delivery Date (for this new letter)</span>
                </label>
                <input
                  type="datetime-local"
                  value={releaseDate}
                  min={nowForInput()}
                  onChange={e => setReleaseDate(e.target.value)}
                  disabled={sending || paidLoading}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-sm focus:border-accent outline-none transition-colors"
                />
                {!isReleaseDateValid && (
                  <p className="font-mono text-[9px] text-red-400 px-2">Pick a date and time in the future.</p>
                )}
                <p className="font-mono text-[9px] text-text-muted/70 px-2 leading-relaxed">
                  {editingLetterId
                    ? "You're editing an existing scheduled letter — saving will re-encrypt it with a fresh key."
                    : "Defaults to tomorrow at the current time — pick any future date. This only sets the release time for the letter you're writing now; it never changes a letter you've already scheduled below."}
                </p>
              </div>
              <div className="flex items-center p-4 rounded-xl bg-surface-2/40 border border-border/60 text-[10px] font-mono text-text-muted leading-relaxed">
                Letters are encrypted locally in your browser before saving. The server can decrypt and email it only when the release date arrives.
              </div>
            </motion.div>
          )}

          {/* Content */}
          <div className="space-y-2 relative border-t border-border/40 pt-4">
            <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Letter Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your letter here..."
              disabled={sending || paidLoading}
              className="w-full bg-surface-2 border border-border rounded-xl p-4 font-mono text-sm min-h-[180px] focus:border-accent outline-none transition-colors resize-none"
            />
            <span className="absolute bottom-3 right-3 font-mono text-[10px] text-text-muted/60">
              {content.length} chars
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-4 pt-2">
            {activeTab === 'instant' ? (
              <>
                <button
                  onClick={handleFreeSend}
                  disabled={!isFormValid || !dbUser || sending || paidLoading}
                  className="pill-button border border-border bg-transparent hover:bg-surface-2 text-text-primary w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="font-mono text-xs uppercase tracking-wider">Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>{dbUser ? 'Send Letter (Free)' : 'Log in to Send'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handlePaidPolish}
                  disabled={!isFormValid || sending || paidLoading || hasNoCelo}
                  className="pill-button pill-button-primary w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {paidLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="font-mono text-xs uppercase tracking-wider">{getStepMessage()}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>AI Polish (0.01 USDm)</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleScheduleSend()}
                  disabled={!isFormValid || !dbUser || !isReleaseDateValid || sending || paidLoading}
                  className="pill-button border border-border bg-transparent hover:bg-surface-2 text-text-primary w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="font-mono text-xs uppercase tracking-wider">
                        {editingLetterId ? 'Updating...' : 'Encrypting & Scheduling...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>
                        {!dbUser ? 'Log in to Schedule' : editingLetterId ? 'Update Letter' : 'Schedule Letter (Free & Encrypted)'}
                      </span>
                    </>
                  )}
                </button>
                {editingLetterId ? (
                  <button
                    onClick={handleCancelEdit}
                    disabled={sending || paidLoading}
                    className="pill-button border border-border bg-transparent hover:bg-surface-2 text-text-muted w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel Edit</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSchedulePolish}
                    disabled={!isFormValid || !dbUser || sending || paidLoading || hasNoCelo}
                    className="pill-button pill-button-primary w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {paidLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-xs uppercase tracking-wider">{getStepMessage()}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI Polish (0.01 USDm)</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Messages & Toasts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-mono tracking-wide flex items-center gap-2 justify-center"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {polishedResponse && activeTab === 'instant' && (
        <div className="space-y-4">
          <h3 className="font-serif text-xl px-2">Polished Version (from history)</h3>
          <ResponseCard response={polishedResponse} />
        </div>
      )}

      {/* Escrow Dashboard List (Only show under schedule tab) */}
      {activeTab === 'schedule' && dbUser && (
        <div className="space-y-4 border-t border-border pt-6">
          <h3 className="font-serif text-xl px-1">Your Scheduled Escrow Letters</h3>
          
          {loadingLetters ? (
            <div className="h-24 flex items-center justify-center text-xs font-mono text-text-muted animate-pulse">
              Loading letters queue...
            </div>
          ) : scheduledLetters.length > 0 ? (
            <div className="grid gap-3">
              {scheduledLetters.map(letter => (
                <div
                  key={letter.id}
                  className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-accent/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-primary font-bold">{letter.recipient_email}</span>
                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        letter.status === 'pending'
                          ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/20'
                          : letter.status === 'sent'
                          ? 'bg-accent-green/15 text-accent-green border border-accent-green/20'
                          : 'bg-red-950/25 text-red-400 border border-red-900/30'
                      }`}>
                        {letter.status}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-text-muted">
                      From: {letter.sender_name} · Release: {new Date(letter.release_date).toLocaleString()}
                    </p>
                  </div>
                  
                  {letter.status === 'pending' && (
                    <div className="flex gap-2 self-start sm:self-center">
                      <button
                        onClick={() => handleEditLetter(letter.id)}
                        className="px-3.5 py-2 hover:bg-surface-2 border border-border/80 hover:border-accent/30 text-xs font-mono text-text-muted hover:text-accent rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleCancelEscrow(letter.id)}
                        className="px-3.5 py-2 hover:bg-red-950/20 border border-border/80 hover:border-red-500/30 text-xs font-mono text-text-muted hover:text-red-400 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancel Escrow</span>
                      </button>
                    </div>
                  )}
                  {letter.status === 'failed' && (
                    <button
                      onClick={() => handleRetryLetter(letter.id)}
                      disabled={retryingId === letter.id}
                      className="px-3.5 py-2 hover:bg-accent/10 border border-border/80 hover:border-accent/30 text-xs font-mono text-text-muted hover:text-accent rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-center disabled:opacity-40"
                    >
                      <span>{retryingId === letter.id ? 'Retrying...' : 'Retry'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
              <Calendar className="w-8 h-8 text-text-muted/30 mx-auto" />
              <p className="text-xs font-mono text-text-muted">You have no scheduled letters in escrow.</p>
            </div>
          )}
        </div>
      )}

      <ConnectWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />

      <ConfirmDialog
        isOpen={cancelEscrowId !== null}
        title="Cancel this scheduled delivery?"
        message="The letter will be permanently deleted."
        confirmLabel="Cancel Delivery"
        danger
        onConfirm={confirmCancelEscrow}
        onCancel={() => setCancelEscrowId(null)}
      />
    </motion.div>
  );
}

function LetterPageLoader() {
  const searchParams = useSearchParams();
  const historyId = searchParams.get('id');
  const contentParam = searchParams.get('content');
  return <LetterPageInner key={historyId ?? 'new'} historyId={historyId} contentParam={contentParam} />;
}

export default function LetterPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center animate-pulse font-mono text-accent uppercase tracking-widest">Loading...</div>}>
      <LetterPageLoader />
    </Suspense>
  );
}
