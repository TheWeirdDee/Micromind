-- MicroMind Short Article Challenges — Database Setup
-- Run this script inside the Supabase SQL Editor dashboard.
--
-- Community writing contest: each month (or whatever cadence the operator
-- chooses) opens a `story_challenges` period with a prompt/theme. Users
-- submit one short article per challenge while submissions are open, then the
-- community votes (one vote per user per challenge, cast for a single article)
-- during the voting window. There is no monetary stake or payout here —
-- winners are purely a reputation/leaderboard feature, so client-direct
-- writes (unlike quest_progress or the staking flow, which move real USDm)
-- are acceptable as long as RLS enforces ownership, one-submission/one-vote
-- limits, no self-voting, and that writes only happen inside the correct
-- time window for that action.

-- 1. Challenge periods ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.story_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    prize_description TEXT NOT NULL DEFAULT 'Community Winner recognition and featured placement (no cash or token prize).' CHECK (char_length(prize_description) BETWEEN 3 AND 500),
    submissions_open_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submissions_close_at TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_close_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CHECK (submissions_close_at > submissions_open_at),
    CHECK (voting_close_at > submissions_close_at)
);

CREATE INDEX IF NOT EXISTS idx_story_challenges_open
  ON public.story_challenges (submissions_open_at DESC);

ALTER TABLE public.story_challenges ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read challenge periods. Only the agent's service-role
-- key (via /api/stories/challenges/open and /finalize, both CRON_SECRET-
-- gated) opens or finalizes a challenge — no client INSERT/UPDATE policy.
DROP POLICY IF EXISTS "Anyone can read story challenges" ON public.story_challenges;
CREATE POLICY "Anyone can read story challenges"
ON public.story_challenges
FOR SELECT
TO authenticated
USING (true);

-- 2. Article submissions ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.story_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
    content TEXT NOT NULL CHECK (
      array_length(regexp_split_to_array(btrim(content), '\s+'), 1) BETWEEN 100 AND 1000
    ),
    image_url TEXT,
    vote_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
    moderation_reason TEXT,
    moderated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT stories_hidden_reason_required CHECK (status <> 'hidden' OR (moderation_reason IS NOT NULL AND char_length(btrim(moderation_reason)) BETWEEN 5 AND 500)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (challenge_id, user_id) -- one submission per user per challenge
);

CREATE INDEX IF NOT EXISTS idx_stories_challenge_votes
  ON public.stories (challenge_id, vote_count DESC);

-- Winner is set by /api/stories/challenges/finalize once voting closes.
ALTER TABLE public.story_challenges
  ADD COLUMN IF NOT EXISTS winner_story_id UUID REFERENCES public.stories(id);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read published stories or your own" ON public.stories;
CREATE POLICY "Read published stories or your own"
ON public.stories
FOR SELECT
TO authenticated
USING (status = 'published' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Submit your own story while submissions are open" ON public.stories;
CREATE POLICY "Submit your own story while submissions are open"
ON public.stories
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.story_challenges c
    WHERE c.id = challenge_id
      AND NOW() BETWEEN c.submissions_open_at AND c.submissions_close_at
  )
);

DROP POLICY IF EXISTS "Edit your own story while submissions are open" ON public.stories;
CREATE POLICY "Edit your own story while submissions are open"
ON public.stories
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.story_challenges c
    WHERE c.id = challenge_id
      AND NOW() BETWEEN c.submissions_open_at AND c.submissions_close_at
  )
);

DROP POLICY IF EXISTS "Delete your own story while submissions are open" ON public.stories;
CREATE POLICY "Delete your own story while submissions are open"
ON public.stories
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.story_challenges c
    WHERE c.id = challenge_id
      AND NOW() < c.submissions_close_at
  )
);

-- Authors can update content fields only; moderation fields remain service-role-only.
REVOKE UPDATE ON public.stories FROM authenticated;
GRANT UPDATE (title, content, image_url, updated_at) ON public.stories TO authenticated;

-- 3. Votes ------------------------------------------------------------------
-- Raw votes are NOT broadly readable (see SELECT policy below) so voter
-- identity per article can't be scraped for brigading/retaliation — public
-- ranking uses stories.vote_count (kept in sync by the trigger further down).
CREATE TABLE IF NOT EXISTS public.story_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.story_challenges(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (challenge_id, user_id) -- one vote per user per challenge (pick a favorite)
);

ALTER TABLE public.story_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read your own vote" ON public.story_votes;
CREATE POLICY "Read your own vote"
ON public.story_votes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Cast your own vote during the voting window" ON public.story_votes;
CREATE POLICY "Cast your own vote during the voting window"
ON public.story_votes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  -- No self-voting.
  AND NOT EXISTS (
    SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()
  )
  -- Article must belong to the challenge being voted in, and only published stories are votable.
  AND EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = story_id AND s.challenge_id = story_votes.challenge_id AND s.status = 'published'
  )
  -- Must be inside that challenge's voting window (after submissions close, before voting closes).
  AND EXISTS (
    SELECT 1 FROM public.story_challenges c
    WHERE c.id = challenge_id
      AND NOW() BETWEEN c.submissions_close_at AND c.voting_close_at
  )
);

DROP POLICY IF EXISTS "Retract your own vote during the voting window" ON public.story_votes;
CREATE POLICY "Retract your own vote during the voting window"
ON public.story_votes
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.story_challenges c
    WHERE c.id = challenge_id AND NOW() < c.voting_close_at
  )
);

-- Keep stories.vote_count in sync with story_votes so the public leaderboard
-- never needs client read access to the raw votes table.
CREATE OR REPLACE FUNCTION public.apply_story_vote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories SET vote_count = vote_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories SET vote_count = vote_count - 1 WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_story_vote_change ON public.story_votes;
CREATE TRIGGER trg_apply_story_vote_change
AFTER INSERT OR DELETE ON public.story_votes
FOR EACH ROW EXECUTE FUNCTION public.apply_story_vote_change();

-- 4. Author display name ----------------------------------------------------
-- Articles join to `public.public_profiles` (id, username only) for the
-- author's display name. That view is defined in
-- docs/profiles_security_hardening.sql — run that script first (it also
-- fixes a critical pre-existing leak on the base `profiles` table).
-- 5. Public article cover images -------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('article-images', 'article-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view article images" ON storage.objects;
CREATE POLICY "Public can view article images" ON storage.objects
FOR SELECT USING (bucket_id = 'article-images');

DROP POLICY IF EXISTS "Users upload own article images" ON storage.objects;
CREATE POLICY "Users upload own article images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own article images" ON storage.objects;
CREATE POLICY "Users update own article images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'article-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own article images" ON storage.objects;
CREATE POLICY "Users delete own article images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'article-images' AND (storage.foldername(name))[1] = auth.uid()::text);
