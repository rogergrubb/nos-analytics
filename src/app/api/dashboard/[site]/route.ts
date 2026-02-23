import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_PASSWORD, SITES, verifySessionToken } from '@/lib/config';
import { getMultiDayStats } from '@/lib/storage';

function isAuthed(req: NextRequest): boolean {
  const cookie = req.cookies.get('nos-auth')?.value;
  if (cookie && verifySessionToken(cookie)) return true;
  if (cookie) {
    try { if (Buffer.from(cookie, 'base64').toString() === DASHBOARD_PASSWORD) return true; } catch {}
  }
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${DASHBOARD_PASSWORD}`) return true;
  return false;
}

export async function GET(req: NextRequest, { params }: { params: { site: string } }) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const site = params.site;
    if (!SITES.includes(site as any)) {
      return NextResponse.json({ error: 'unknown site' }, { status: 404 });
    }

    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');
    const stats = await getMultiDayStats(site, Math.min(Math.max(days, 1), 90));

    return NextResponse.json(stats);
  } catch (e: any) {
    console.error('dashboard site error:', e.message, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
