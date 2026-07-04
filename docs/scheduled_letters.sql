-- MicroMind Scheduled Letters Database Setup
-- Run this script inside the Supabase SQL Editor dashboard.

-- 1. Create the scheduled_letters table
CREATE TABLE IF NOT EXISTS public.scheduled_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    ciphertext TEXT NOT NULL,
    iv VARCHAR(64) NOT NULL,
    key_hex VARCHAR(128) NOT NULL, -- Escrowed AES key to allow server decryption
    release_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create index on release_date and status for fast cron queries
CREATE INDEX IF NOT EXISTS idx_letters_release_status 
ON public.scheduled_letters(release_date, status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.scheduled_letters ENABLE ROW LEVEL SECURITY;

-- 4. Set up security policies
DROP POLICY IF EXISTS "Users can create their own letters" ON public.scheduled_letters;
CREATE POLICY "Users can create their own letters" 
ON public.scheduled_letters 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own letters" ON public.scheduled_letters;
CREATE POLICY "Users can view their own letters" 
ON public.scheduled_letters 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can edit their own letters" ON public.scheduled_letters;
CREATE POLICY "Users can edit their own letters" 
ON public.scheduled_letters 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own letters" ON public.scheduled_letters;
CREATE POLICY "Users can delete their own letters" 
ON public.scheduled_letters 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
