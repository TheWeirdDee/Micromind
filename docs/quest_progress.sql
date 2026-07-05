-- MicroMind Quest Progress Database Setup
-- Run this script inside the Supabase SQL Editor dashboard.

-- 1. Create the quest_progress table
CREATE TABLE IF NOT EXISTS public.quest_progress (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL DEFAULT 1,
    current_stage INTEGER NOT NULL DEFAULT 1,
    completed_levels INTEGER[] NOT NULL DEFAULT '{}',
    clarity_points INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

-- 3. Set up security policies
DROP POLICY IF EXISTS "Users can read own quest progress" ON public.quest_progress;
CREATE POLICY "Users can read own quest progress" 
ON public.quest_progress 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own quest progress" ON public.quest_progress;
CREATE POLICY "Users can upsert own quest progress" 
ON public.quest_progress 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
