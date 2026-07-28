-- MicroMind Admin Users — Database Setup
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- Backs the admin dashboard (/app/admin) — story challenge creation/
-- finalization and admin-role management. Deliberately has NO client-facing
-- RLS policies at all (RLS enabled, zero policies = zero rows visible to
-- `anon`/`authenticated`). Only the agent backend's service-role key
-- (bypasses RLS) ever reads or writes this table, and every /api/admin/*
-- route independently re-verifies the caller is already an admin before
-- doing anything — the frontend NEVER queries this table directly.

CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- No CREATE POLICY statements — intentional.

-- Seed the initial admins. Both must already have a profiles row (i.e. have
-- signed up in the app) — if one hasn't yet, re-run this after they do.
INSERT INTO public.admin_users (user_id, email)
SELECT id, email FROM public.profiles
WHERE email IN ('divinedilibe@gmail.com', 'divinenation1@gmail.com')
ON CONFLICT (user_id) DO NOTHING;
