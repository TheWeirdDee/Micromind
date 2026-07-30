'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, Clock3, Inbox, LifeBuoy, Mail, MessageSquare, RefreshCw, Search } from 'lucide-react';
import {
  fetchSupportDashboard,
  fetchSupportMessages,
  updateSupportTicket,
  type SupportConversation,
  type SupportMessage,
  type SupportTicket,
} from '@/lib/admin';

type SupportView = 'tickets' | 'conversations';
type TicketStatus = SupportTicket['status'];

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

export function SupportAdminPanel({ token }: { token: string }) {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [view, setView] = useState<SupportView>('tickets');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSupportDashboard(token);
      setConversations(data.conversations);
      setTickets(data.tickets);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetchSupportDashboard(token)
      .then((data) => {
        if (!active) return;
        setConversations(data.conversations);
        setTickets(data.tickets);
      })
      .catch((err) => { if (active) setError((err as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const ticketByConversation = useMemo(
    () => new Map(tickets.map((ticket) => [ticket.conversation_id, ticket])),
    [tickets],
  );

  const visibleConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const ticket = ticketByConversation.get(conversation.id);
      if (view === 'tickets' && !ticket) return false;
      if (view === 'tickets' && statusFilter !== 'all' && ticket?.status !== statusFilter) return false;
      if (!normalized) return true;
      return [conversation.name, conversation.email, ticket?.subject, ticket?.summary]
        .some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [conversations, query, statusFilter, ticketByConversation, view]);

  const selectedConversation = conversations.find((item) => item.id === selectedId) ?? null;
  const selectedTicket = selectedConversation ? ticketByConversation.get(selectedConversation.id) ?? null : null;

  async function selectConversation(id: string) {
    setSelectedId(id);
    setLoadingMessages(true);
    setMessages([]);
    try {
      setMessages(await fetchSupportMessages(token, id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function changeStatus(status: TicketStatus) {
    if (!selectedTicket) return;
    try {
      await updateSupportTicket(token, selectedTicket.id, status);
      setTickets((current) => current.map((ticket) => (
        ticket.id === selectedTicket.id ? { ...ticket, status, updated_at: new Date().toISOString() } : ticket
      )));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const openCount = tickets.filter((ticket) => ticket.status === 'open').length;
  const progressCount = tickets.filter((ticket) => ticket.status === 'in_progress').length;

  return (
    <section className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-3">
        <button onClick={() => { setView('tickets'); setStatusFilter('open'); }} className="bg-surface border border-border rounded-2xl p-4 text-left hover:border-accent/40 transition">
          <span className="flex items-center justify-between"><Inbox className="w-4 h-4 text-amber-300" /><span className="text-[9px] font-mono uppercase text-text-muted">Needs action</span></span>
          <strong className="block font-serif text-2xl mt-3">{openCount}</strong><span className="text-[10px] font-mono text-text-muted">Open tickets</span>
        </button>
        <button onClick={() => { setView('tickets'); setStatusFilter('in_progress'); }} className="bg-surface border border-border rounded-2xl p-4 text-left hover:border-accent/40 transition">
          <span className="flex items-center justify-between"><Clock3 className="w-4 h-4 text-accent" /><span className="text-[9px] font-mono uppercase text-text-muted">Assigned</span></span>
          <strong className="block font-serif text-2xl mt-3">{progressCount}</strong><span className="text-[10px] font-mono text-text-muted">In progress</span>
        </button>
        <button onClick={() => setView('conversations')} className="bg-surface border border-border rounded-2xl p-4 text-left hover:border-accent/40 transition">
          <span className="flex items-center justify-between"><MessageSquare className="w-4 h-4 text-accent-green" /><span className="text-[9px] font-mono uppercase text-text-muted">All activity</span></span>
          <strong className="block font-serif text-2xl mt-3">{conversations.length}</strong><span className="text-[10px] font-mono text-text-muted">Conversations</span>
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex rounded-xl bg-bg p-1">
            <button onClick={() => setView('tickets')} className={`px-3 py-2 rounded-lg text-[10px] font-mono ${view === 'tickets' ? 'bg-surface-2 text-text-primary' : 'text-text-muted'}`}>Tickets ({tickets.length})</button>
            <button onClick={() => setView('conversations')} className={`px-3 py-2 rounded-lg text-[10px] font-mono ${view === 'conversations' ? 'bg-surface-2 text-text-primary' : 'text-text-muted'}`}>All chats ({conversations.length})</button>
          </div>
          <label className="sm:ml-auto flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2 min-w-0 sm:w-64"><Search className="w-3.5 h-3.5 text-text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email or subject" className="bg-transparent outline-none text-xs min-w-0 flex-1" /></label>
          <button onClick={load} disabled={loading} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-muted hover:text-accent"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>

        {view === 'tickets' && <div className="px-3 py-2 border-b border-border flex gap-2 overflow-x-auto">
          {(['all', ...STATUSES] as const).map((status) => <button key={status} onClick={() => setStatusFilter(status)} className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase ${statusFilter === status ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'}`}>{status.replace('_', ' ')}</button>)}
        </div>}

        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] min-h-[480px]">
          <div className="border-b lg:border-b-0 lg:border-r border-border max-h-[480px] overflow-y-auto">
            {visibleConversations.length === 0 ? <div className="p-8 text-center"><LifeBuoy className="w-6 h-6 mx-auto text-text-muted mb-2" /><p className="text-xs font-mono text-text-muted">Nothing in this view.</p></div> : visibleConversations.map((conversation) => {
              const ticket = ticketByConversation.get(conversation.id);
              const selected = conversation.id === selectedId;
              return <button key={conversation.id} onClick={() => selectConversation(conversation.id)} className={`w-full p-4 text-left border-b border-border/50 transition ${selected ? 'bg-accent/10 border-l-2 border-l-accent' : 'hover:bg-bg/40'}`}>
                <span className="flex items-center gap-2"><strong className="text-xs font-mono truncate">{conversation.name || conversation.email}</strong>{ticket && <span className={`ml-auto text-[8px] uppercase rounded-full px-2 py-0.5 ${ticket.status === 'open' ? 'bg-amber-500/10 text-amber-300' : ticket.status === 'resolved' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent/10 text-accent'}`}>{ticket.status.replace('_', ' ')}</span>}</span>
                <span className="block text-[10px] font-mono text-text-muted truncate mt-1">{ticket?.subject || conversation.email}</span>
                <span className="block text-[9px] font-mono text-text-muted/70 mt-2">{new Date(conversation.updated_at).toLocaleString()}</span>
              </button>;
            })}
          </div>

          <div className="min-w-0 flex flex-col max-h-[620px]">
            {!selectedConversation ? <div className="flex-1 flex items-center justify-center p-8 text-center"><div><MessageSquare className="w-8 h-8 mx-auto text-text-muted/40" /><p className="font-serif mt-3">Select a conversation</p><p className="text-[10px] font-mono text-text-muted mt-1">Choose a ticket or chat to review its full history.</p></div></div> : <>
              <header className="p-4 border-b border-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3"><div className="min-w-0"><h3 className="font-serif text-lg truncate">{selectedTicket?.subject || 'Support conversation'}</h3><p className="text-[10px] font-mono text-text-muted mt-1">{selectedConversation.name || 'Visitor'} · {selectedConversation.email}</p></div><a href={`mailto:${selectedConversation.email}?subject=${encodeURIComponent(selectedTicket ? `Re: ${selectedTicket.subject}` : 'MicroMind support')}`} className="sm:ml-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-accent/40 text-accent text-[10px] font-mono"><Mail className="w-3.5 h-3.5" />Email user</a></div>
                {selectedTicket && <><p className="text-xs text-text-muted leading-relaxed bg-bg rounded-xl p-3">{selectedTicket.summary}</p><div className="flex flex-wrap gap-1.5">{STATUSES.map((status) => <button key={status} onClick={() => changeStatus(status)} disabled={selectedTicket.status === status} className="text-[9px] font-mono uppercase px-2.5 py-1.5 rounded-lg border border-border disabled:bg-accent/15 disabled:text-accent disabled:border-accent/20">{status.replace('_', ' ')}</button>)}</div></>}
              </header>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg/20">{loadingMessages ? <p className="text-xs font-mono text-text-muted">Loading conversation…</p> : messages.map((message) => <div key={message.id} className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${message.role === 'user' ? 'ml-auto bg-accent text-bg' : 'bg-surface border border-border'}`}><p className="text-[8px] font-mono uppercase opacity-60 mb-1">{message.role}</p>{message.attachment_url && <a href={message.attachment_url} target="_blank" rel="noreferrer" className="block mb-2"><Image src={message.attachment_url} alt={message.attachment_name || 'Support screenshot'} width={900} height={600} unoptimized className="w-full max-h-72 object-contain rounded-xl border border-border/60 bg-bg" /></a>}{message.content}{message.attachment_url && <p className="text-[8px] font-mono mt-2 opacity-60">{message.attachment_ai_consent ? 'AI analysis allowed' : 'Human review only'} · Click image to enlarge</p>}</div>)}</div>
              {selectedTicket?.status === 'resolved' && <div className="p-3 border-t border-border text-[10px] font-mono text-accent-green flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />Marked resolved</div>}
            </>}
          </div>
        </div>
      </div>
    </section>
  );
}
