-- MicroMind Profiles Security Hardening — RUN THIS IMMEDIATELY
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- CRITICAL: verified live on 2026-07-28 — the `profiles` table's SELECT
-- policy ("Anyone can read profiles" USING (true), no `TO` restriction, per
-- the bootstrap script in README.md) is readable by a completely
-- unauthenticated client using only the public anon key (which ships in
-- every frontend bundle). `profiles` holds `email` and `journal_key_hex`
-- (the per-account AES-GCM key that encrypts journal content client-side) —
-- both were fully exposed for every user, for anyone, no login required.
-- This directly undermines the "zero-knowledge encryption" claim: anyone
-- could pair the leaked key with a user's encrypted journal entries and
-- decrypt them.
--
-- Fix: restrict SELECT to "your own row only". Username lookups that
-- legitimately need to see OTHER users (signup availability check, story
-- author attribution) go through `public_profiles`, a narrow view exposing
-- only `id`/`username` — the sensitive columns are structurally unreachable
-- through it regardless of RLS.

-- Drop every existing SELECT policy on profiles by name, whatever it's
-- actually called (don't assume it matches the bootstrap script verbatim).
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Narrow public view for cross-user username lookups (signup availability
-- check, story author attribution). Only id/username are selectable — never
-- email or journal_key_hex — regardless of what RLS allows on the base table.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, username FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
