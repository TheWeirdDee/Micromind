-- Article deletion + accountable moderation
-- Run once in the Supabase SQL editor before deploying this UI/API update.

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE;

UPDATE public.stories
SET moderation_reason = 'Hidden by moderation before reason tracking was introduced.',
    moderated_at = COALESCE(moderated_at, NOW())
WHERE status = 'hidden' AND (moderation_reason IS NULL OR btrim(moderation_reason) = '');

ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_hidden_reason_required;
ALTER TABLE public.stories ADD CONSTRAINT stories_hidden_reason_required
  CHECK (status <> 'hidden' OR (moderation_reason IS NOT NULL AND char_length(btrim(moderation_reason)) BETWEEN 5 AND 500));

-- Authors may edit article content, but can never change moderation state/reasons.
REVOKE UPDATE ON public.stories FROM authenticated;
GRANT UPDATE (title, content, image_url, updated_at) ON public.stories TO authenticated;

-- Authors may withdraw before submissions close. Votes cascade-delete with the article.
DROP POLICY IF EXISTS "Delete your own story while submissions are open" ON public.stories;
CREATE POLICY "Delete your own story while submissions are open"
ON public.stories FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.story_challenges c
    WHERE c.id = challenge_id AND NOW() < c.submissions_close_at
  )
);