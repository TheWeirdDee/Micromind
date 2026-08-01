import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const metric = await request.json().catch(() => null);
  if (metric && typeof metric.name === 'string' && typeof metric.value === 'number') {
    console.info('[web-vital]', metric);
  }
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}