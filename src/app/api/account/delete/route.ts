import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Tables holding per-user rows, keyed by their user-id column. */
const USER_TABLES: { table: string; column: string }[] = [
  { table: 'journal_entries', column: 'user_id' },
  { table: 'quest_progress', column: 'user_id' },
  { table: 'quest_vocabulary', column: 'user_id' },
  { table: 'scheduled_letters', column: 'user_id' },
  { table: 'profiles', column: 'id' },
];

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Account deletion not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolve the caller from their own access token — they can only delete themselves
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  try {
    for (const { table, column } of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq(column, user.id);
      // Missing tables (e.g. schema not applied yet) should not block account deletion
      if (error && !/does not exist/i.test(error.message)) {
        console.error(`[API/account/delete] Failed to clear ${table}:`, error.message);
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Account deletion failed';
    console.error('[API/account/delete]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
