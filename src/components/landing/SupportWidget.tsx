'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, CheckCircle2, Headphones, ImagePlus, MessageCircle, Send, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Message = { role: 'user' | 'assistant'; content: string; attachmentUrl?: string };
const API = process.env.NEXT_PUBLIC_AGENT_API_URL;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function getVisitorId() {
  const key = 'mm_support_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

export function SupportWidget() {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiImageConsent, setAiImageConsent] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'Hi! I’m the MicroMind support assistant. What can I help you with?' }]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  function chooseImage(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a PNG, JPEG, or WebP screenshot.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError('Screenshot must be smaller than 4 MB.'); return; }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setAiImageConsent(false);
    setError('');
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null); setImagePreview(null); setAiImageConsent(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if ((!text && !image) || busy) return;
    const outgoingPreview = imagePreview || undefined;
    const outgoingImage = image;
    setError(''); setDraft(''); setBusy(true);
    setMessages((current) => [...current, { role: 'user', content: text || 'Attached a screenshot.', attachmentUrl: outgoingPreview }]);
    try {
      const form = new FormData();
      form.append('conversationId', conversationId || '');
      form.append('visitorId', getVisitorId());
      form.append('name', name.trim());
      form.append('email', email.trim());
      form.append('message', text);
      form.append('pageUrl', location.href);
      form.append('aiImageConsent', String(!!outgoingImage && aiImageConsent));
      if (outgoingImage) form.append('image', outgoingImage);
      const response = await fetch(`${API}/api/support/chat`, {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Support is unavailable right now.');
      setConversationId(body.conversationId);
      setMessages((current) => [...current, { role: 'assistant', content: body.answer }]);
      if (body.ticketId) setTicketId(body.ticketId);
      clearImage();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button onClick={() => { setOpen((value) => !value); if (!email && user?.email) setEmail(user.email); }} aria-label="Open support chat" className="fixed z-50 bottom-5 right-5 w-14 h-14 rounded-full bg-accent text-bg shadow-2xl flex items-center justify-center hover:scale-105 transition-transform">{open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}</button>
    {open && <section aria-label="MicroMind support" className="fixed z-50 bottom-24 right-4 sm:right-5 w-[calc(100vw-2rem)] sm:w-[400px] h-[min(650px,calc(100vh-8rem))] bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col">
      <header className="p-4 border-b border-border bg-bg/50 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center"><Headphones className="w-4 h-4" /></div><div><h2 className="font-serif text-base">MicroMind Support</h2><p className="font-mono text-[9px] uppercase tracking-wider text-text-muted">AI help · human escalation</p></div></header>
      {!started ? <div className="p-5 space-y-4 overflow-y-auto"><div><h3 className="font-serif text-xl">How can we help?</h3><p className="font-mono text-xs text-text-muted mt-2 leading-relaxed">Enter your email so we can contact you if the AI needs to open a ticket.</p></div><label className="block text-[10px] font-mono uppercase text-text-muted">Name (optional)<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="mt-1.5 w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-sm normal-case" /></label><label className="block text-[10px] font-mono uppercase text-text-muted">Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className="mt-1.5 w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-sm normal-case" /></label><div className="flex gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-200 leading-relaxed"><AlertTriangle className="w-4 h-4 shrink-0" />Never share passwords, recovery phrases, private keys, payment details, or journal contents.</div><button disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={() => setStarted(true)} className="w-full bg-accent text-bg rounded-xl py-3 font-serif font-bold disabled:opacity-40">Start chat</button><p className="text-[9px] font-mono text-text-muted text-center">Chats and attachments are saved and may be reviewed by MicroMind support.</p></div> : <>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{messages.map((message, index) => <div key={index} className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${message.role === 'user' ? 'ml-auto bg-accent text-bg' : 'bg-bg border border-border text-text-primary'}`}>{message.attachmentUrl && <Image src={message.attachmentUrl} alt="Support attachment" width={600} height={320} unoptimized className="w-full max-h-48 object-cover rounded-xl mb-2" />}{message.content}</div>)}{busy && <div className="text-[10px] font-mono text-text-muted">Thinking…</div>}{ticketId && <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs"><CheckCircle2 className="inline w-4 h-4 text-accent mr-2" />Ticket opened. We will reply to {email}. You can keep chatting here.<div className="font-mono text-[9px] text-text-muted mt-1">Reference: {ticketId.slice(0, 8).toUpperCase()}</div></div>}{error && <div className="text-xs text-red-400">{error}</div>}<div ref={endRef} /></div>
        <form onSubmit={send} className="p-3 border-t border-border space-y-2">{imagePreview && <div className="rounded-xl border border-border bg-bg p-2"><div className="relative"><Image src={imagePreview} alt="Screenshot preview" width={600} height={240} unoptimized className="w-full h-28 object-cover rounded-lg" /><button type="button" onClick={clearImage} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-bg/90 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></div><label className="mt-2 flex items-start gap-2 text-[9px] font-mono text-text-muted leading-relaxed"><input type="checkbox" checked={aiImageConsent} onChange={(event) => setAiImageConsent(event.target.checked)} className="mt-0.5" /><span>Allow the AI provider to analyze this screenshot. Leave unchecked to share it only with MicroMind’s human support.</span></label></div>}<div className="flex gap-2"><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} className="hidden" /><button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach screenshot" className="w-10 rounded-xl border border-border text-text-muted hover:text-accent flex items-center justify-center"><ImagePlus className="w-4 h-4" /></button><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder={ticketId ? 'Add more details or ask another question...' : 'Describe the issue...'} className="flex-1 resize-none bg-bg border border-border rounded-xl px-3 py-2 text-xs" /><button disabled={(!draft.trim() && !image) || busy} className="w-10 rounded-xl bg-accent text-bg disabled:opacity-40 flex items-center justify-center"><Send className="w-4 h-4" /></button></div></form>
      </>}
    </section>}
  </>;
}
