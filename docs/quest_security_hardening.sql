-- MicroMind Quest Security Hardening
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- Context: quest_progress.clarity_points is redeemed for real USDm via the
-- agent's /api/quest/withdraw endpoint. The original policy below let any
-- authenticated user upsert an ARBITRARY clarity_points value into their own
-- row directly from the browser (e.g. via the Supabase JS client), which the
-- withdraw endpoint then paid out as real money — a critical financial
-- integrity bug. Points must now only ever be written by the agent backend
-- (which uses the service-role key and independently validates every
-- state change via /api/quest/solve, /api/quest/withdraw, /api/quest/reset).

DROP POLICY IF EXISTS "Users can upsert own quest progress" ON public.quest_progress;

-- Read-only for clients — no INSERT/UPDATE/DELETE policy for `authenticated`.
-- The service role (used only by the agent) bypasses RLS entirely.
DROP POLICY IF EXISTS "Users can read own quest progress" ON public.quest_progress;
CREATE POLICY "Users can read own quest progress"
ON public.quest_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
