-- MicroMind Journal Encryption Setup
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- Adds an escrowed per-user AES-GCM-256 key used to encrypt the `content`
-- field of journal_entries client-side before it ever reaches Supabase.
-- This is the same escrowed-key pattern already used for scheduled_letters
-- (see scheduled_letters.sql) — it protects against a database breach, not
-- against the app operator (the key is stored server-side too).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS journal_key_hex TEXT;
