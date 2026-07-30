-- MicroMind support chat and ticketing. Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;
create table if not exists public.support_conversations (id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,visitor_id uuid not null,name text,email text not null,status text not null default 'open' check(status in('open','ticketed','closed')),page_url text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.support_messages (id bigint generated always as identity primary key,conversation_id uuid not null references public.support_conversations(id) on delete cascade,role text not null check(role in('user','assistant','system')),content text not null check(char_length(content) between 1 and 4000),created_at timestamptz not null default now());
create table if not exists public.support_tickets (id uuid primary key default gen_random_uuid(),conversation_id uuid not null unique references public.support_conversations(id) on delete cascade,user_id uuid references auth.users(id) on delete set null,name text,email text not null,subject text not null,summary text not null,status text not null default 'open' check(status in('open','in_progress','resolved','closed')),priority text not null default 'normal' check(priority in('low','normal','high','urgent')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists support_conversations_updated_idx on public.support_conversations(updated_at desc);
create index if not exists support_messages_conversation_idx on public.support_messages(conversation_id,created_at);
create index if not exists support_tickets_status_idx on public.support_tickets(status,created_at desc);
alter table public.support_conversations enable row level security; alter table public.support_messages enable row level security; alter table public.support_tickets enable row level security;
revoke all on public.support_conversations,public.support_messages,public.support_tickets from anon,authenticated;
revoke all on sequence public.support_messages_id_seq from anon,authenticated;
-- Screenshot attachments (safe to run after the original migration).
alter table public.support_messages add column if not exists attachment_path text;
alter table public.support_messages add column if not exists attachment_mime text;
alter table public.support_messages add column if not exists attachment_name text;
alter table public.support_messages add column if not exists attachment_ai_consent boolean not null default false;

-- Private bucket: files are only exposed through short-lived signed URLs made
-- by the service-role backend. No browser storage policies are intentionally created.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
