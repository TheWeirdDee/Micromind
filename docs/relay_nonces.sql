-- MicroMind Relay Nonce Store
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- Context: /api/relay and /api/challenge/relay accept EIP-712 signed requests
-- carrying a client-chosen nonce for replay protection. That protection used
-- to live in an in-memory Set on the agent process, which reset to empty on
-- every restart/redeploy (Railway restarts routinely), leaving only the
-- 5-minute request `deadline` as a backstop. This table makes the claim
-- durable, and the agent claims a nonce via a single INSERT (relying on the
-- unique constraint below) so two concurrent requests for the same signed
-- payload can't both slip through a check-then-write race.

CREATE TABLE IF NOT EXISTS public.relay_nonces (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_address TEXT NOT NULL,
    nonce TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (user_address, nonce)
);

CREATE INDEX IF NOT EXISTS relay_nonces_created_at_idx ON public.relay_nonces (created_at);

-- Enable RLS with NO policies for `anon`/`authenticated` — this table is an
-- internal replay-protection ledger, never read or written by a client. Only
-- the agent's service-role key (which bypasses RLS entirely) may touch it.
ALTER TABLE public.relay_nonces ENABLE ROW LEVEL SECURITY;

-- Optional maintenance: nonces are only ever checked against a request's own
-- 5-minute deadline window, so rows older than a day or two are safe to prune.
-- Run periodically (e.g. via the existing cron infrastructure) if the table
-- grows large enough to matter:
--   DELETE FROM public.relay_nonces WHERE created_at < NOW() - INTERVAL '2 days';
