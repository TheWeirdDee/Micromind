-- MicroMind Letters Hardening
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- Context: a security/completeness review of the "Heartfelt Letters" feature
-- found scheduled_letters had no bound on the `status` column, no constraint
-- requiring release_date to actually be in the future, no retry accounting,
-- and an UPDATE policy permissive enough to let a client flip `status` or
-- `user_id` directly via a raw Supabase update call. Separately, the instant
-- (non-escrowed) send route had NO authentication at all — see the paired
-- fix in src/app/api/letter/send/route.ts. This script hardens all of that.

-- 1. Bound the status column to known values (was unconstrained free text).
--    'processing' is new — the release cron claims a row into this state
--    before working on it, so two overlapping cron runs can't double-send.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_letters_status_check'
  ) THEN
    ALTER TABLE public.scheduled_letters
      ADD CONSTRAINT scheduled_letters_status_check
      CHECK (status IN ('pending', 'processing', 'sent', 'failed'));
  END IF;
END $$;

-- 2. Require release_date to be after the letter's own creation time. NOT
--    VALID so it doesn't choke on any pre-existing rows; every new
--    insert/update from here on is checked. (The frontend separately
--    enforces "must be in the future relative to right now" at write time —
--    this constraint is the durable backstop.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_letters_release_after_created'
  ) THEN
    ALTER TABLE public.scheduled_letters
      ADD CONSTRAINT scheduled_letters_release_after_created
      CHECK (release_date > created_at) NOT VALID;
  END IF;
END $$;

-- 3. Retry accounting for the release cron (see agent/src/index.ts).
ALTER TABLE public.scheduled_letters ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

-- 4. Tighten the UPDATE policy: a client may only edit a letter that is
--    still pending, and the edit must leave it pending — can't be used to
--    claim it as sent/processing or hand it to another user_id.
DROP POLICY IF EXISTS "Users can edit their own letters" ON public.scheduled_letters;
DROP POLICY IF EXISTS "Users can edit their own pending letters" ON public.scheduled_letters;
CREATE POLICY "Users can edit their own pending letters"
ON public.scheduled_letters
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- 5. Column-level grant: even under the policy above, restrict which
--    columns a client can actually write. status/attempts/user_id/id/
--    created_at are never client-writable — retrying a failed letter
--    (failed -> pending) goes through the agent's /api/letter/retry route,
--    which uses the service-role key and bypasses RLS/grants entirely.
REVOKE UPDATE ON public.scheduled_letters FROM authenticated;
GRANT UPDATE (recipient_email, sender_name, ciphertext, iv, key_hex, release_date)
  ON public.scheduled_letters TO authenticated;

-- 6. Durable per-user rate-limit log for instant (non-escrowed) letter
--    sends. /api/letter/send now requires auth (see route.ts) and checks
--    this table for how many sends happened in the last hour before
--    allowing another. No client-facing RLS policies — only the Next.js
--    route (service-role key) ever reads/writes it.
CREATE TABLE IF NOT EXISTS public.instant_letter_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_instant_letter_log_user_time ON public.instant_letter_log (user_id, sent_at);
ALTER TABLE public.instant_letter_log ENABLE ROW LEVEL SECURITY;
