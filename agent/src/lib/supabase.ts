/**
 * Supabase client for the agent backend.
 * Uses the Service Role Key to bypass Row Level Security (RLS)
 * so the release cron can fetch scheduled letters from all users.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://vxjibxhedfeyzddvfxdn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.warn(
    '[WARN] SUPABASE_SERVICE_ROLE_KEY is missing from the environment. ' +
    'The escrow release cron (/api/cron/release-letters) will fail to query letters.'
  );
}

export const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
