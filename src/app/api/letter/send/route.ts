import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || 'MicroMind Letters <onboarding@resend.dev>';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_SENDS_PER_HOUR = 10;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content, recipientEmail, senderName, subject: customSubject } = body;

  if (!content || !recipientEmail || !senderName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (!resend) {
    return NextResponse.json({ error: 'Email service not configured. Add RESEND_API_KEY to .env.local' }, { status: 503 });
  }

  // This route sends real email through the app's own Resend account, so it
  // must never act as an open, anonymous relay — require a valid signed-in
  // session, matching the pattern in /api/account/delete.
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Auth not configured on the server' }, { status: 503 });
  }
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Please log in to send a letter.' }, { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  // Durable per-user rate limit (persists across serverless invocations,
  // unlike an in-memory counter) — caps how many instant letters one
  // account can send per hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from('instant_letter_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('sent_at', oneHourAgo);

  if (countError) {
    console.error('[API/letter/send] Rate limit check failed:', countError.message);
  } else if ((count ?? 0) >= MAX_SENDS_PER_HOUR) {
    return NextResponse.json({ error: 'Too many letters sent recently. Please try again later.' }, { status: 429 });
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: recipientEmail,
      subject: customSubject ?? `A letter for you, from ${senderName}`,
      text: `${content}\n\n---\nSent via MicroMind · https://micromindapp.xyz/app`,
    });

    await admin.from('instant_letter_log').insert({ user_id: user.id });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to send';
    console.error('[API/letter/send]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
