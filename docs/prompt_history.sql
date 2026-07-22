-- MicroMind Prompt History Database Setup
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- Authoritative, server-written record of paid AI-prompt interactions.
-- Only the agent backend (service role key, bypasses RLS) writes rows —
-- there is deliberately no INSERT/UPDATE policy for the `authenticated`
-- role, since client-supplied history would be unverifiable.

CREATE TABLE IF NOT EXISTS public.prompt_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_id INTEGER NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    cost VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Fast lookup for a user's own history, newest first
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_created
  ON public.prompt_history(user_id, created_at DESC);

-- Guards against duplicate inserts across the direct/relay/poll code paths
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_history_tx_hash
  ON public.prompt_history(tx_hash);

ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own prompt history" ON public.prompt_history;
CREATE POLICY "Users can view their own prompt history"
ON public.prompt_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
