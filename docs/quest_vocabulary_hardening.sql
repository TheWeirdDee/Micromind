-- MicroMind Quest Vocabulary Security Hardening
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- Same overly-permissive pattern as the original quest_progress policy
-- (docs/quest_security_hardening.sql) — any authenticated user could upsert
-- arbitrary content into their own quest_vocabulary row directly from the
-- browser. Low real-world impact here (it's a personal word-definitions
-- cache with no points/currency tied to it), but tightened for consistency:
-- writes now go through the agent's authenticated /api/quest/vocabulary
-- endpoint instead.

DROP POLICY IF EXISTS "Users can upsert own quest vocabulary" ON public.quest_vocabulary;

DROP POLICY IF EXISTS "Users can read own quest vocabulary" ON public.quest_vocabulary;
CREATE POLICY "Users can read own quest vocabulary"
ON public.quest_vocabulary
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
