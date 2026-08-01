-- Article challenge prize disclosure
-- Run once in the Supabase SQL editor before creating challenges with the updated admin form.

ALTER TABLE public.story_challenges
  ADD COLUMN IF NOT EXISTS prize_description TEXT;

UPDATE public.story_challenges
SET prize_description = 'Community Winner recognition and featured placement. No cash or token prize has been announced for this challenge.'
WHERE prize_description IS NULL OR btrim(prize_description) = '';

ALTER TABLE public.story_challenges
  ALTER COLUMN prize_description SET DEFAULT 'Community Winner recognition and featured placement (no cash or token prize).',
  ALTER COLUMN prize_description SET NOT NULL;

ALTER TABLE public.story_challenges
  DROP CONSTRAINT IF EXISTS story_challenges_prize_description_length;
ALTER TABLE public.story_challenges
  ADD CONSTRAINT story_challenges_prize_description_length
  CHECK (char_length(prize_description) BETWEEN 3 AND 500);