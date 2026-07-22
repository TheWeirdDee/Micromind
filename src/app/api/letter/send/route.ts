import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? 'MicroMind Letters <onboarding@resend.dev>';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content, recipientEmail, senderName, subject: customSubject } = body;

  if (!content || !recipientEmail || !senderName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (!resend) {
    return NextResponse.json({ error: 'Email service not configured. Add RESEND_API_KEY to .env.local' }, { status: 503 });
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: recipientEmail,
      subject: customSubject ?? `A letter for you, from ${senderName}`,
      text: `${content}\n\n---\nSent via MicroMind · https://micromindapp.xyz/app`,
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to send';
    console.error('[API/letter/send]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
