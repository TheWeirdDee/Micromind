-- MicroMind Push Subscriptions Database Setup
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- Stores Web Push subscriptions (one row per device/browser a user has
-- enabled reminders on) so the agent's /api/cron/send-reminder-pushes route
-- can send a real OS notification when someone hasn't journaled in 24h.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    last_reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A permissive per-row policy is fine here (unlike quest_progress's
-- clarity_points) — the worst a user can do to their own row is stop their
-- own notifications from working. Multiple rows per user_id are expected
-- (one per device); endpoint is the natural unique key.
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
