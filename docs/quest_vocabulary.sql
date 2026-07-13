-- MicroMind Quest Vocabulary Database Setup
-- Run this script inside the Supabase SQL Editor dashboard.

-- 1. Create the quest_vocabulary table
CREATE TABLE IF NOT EXISTS public.quest_vocabulary (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL,
    level_name TEXT NOT NULL,
    category TEXT NOT NULL,
    target_word TEXT NOT NULL,
    definition TEXT NOT NULL,
    examples TEXT[] NOT NULL DEFAULT '{}',
    synonyms TEXT[] NOT NULL DEFAULT '{}',
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, stage_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.quest_vocabulary ENABLE ROW LEVEL SECURITY;

-- 3. Set up security policies
DROP POLICY IF EXISTS "Users can read own quest vocabulary" ON public.quest_vocabulary;
CREATE POLICY "Users can read own quest vocabulary"
ON public.quest_vocabulary
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own quest vocabulary" ON public.quest_vocabulary;
CREATE POLICY "Users can upsert own quest vocabulary"
ON public.quest_vocabulary
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
