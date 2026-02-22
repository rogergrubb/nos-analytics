import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_PASSWORD, SITES, verifySessionToken } from '@/lib/config';
import { getMultiDayStats } from '@/lib/storage';

function isAuthed(req: NextRequest): boolean {
  // Check HMAC session token first (new)
  const cookie = req.cookies.get('nos-auth')?.value;
  if (cookie && verifySessionToken(cookie)) return true;

  // Fallback: legacy base64 cookie (for existing sessions — remove after 30 days)
  if (cookie) {
    try {
      if (Buffer.from(cookie, 'base64').toString() === DASHBOARD_PASSWORD) return true;
    } catch {}
  }

  // Bearer token
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${DASHBOARD_PASSWORD}`) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const days = parseInt(req.nextUrl.searchParams.get('days') || '30');
  const clampedDays = Math.min(Math.max(days, 1), 90);

  const results = await Promise.all(
    SITES.map(async (site) => {
      const stats = await getMultiDayStats(site, clampedDays);
      return stats;
    })
  );

  const allRealtime = results.reduce((sum, r) => sum + r.realtime, 0);
  const allEvents = results.reduce((sum, r) => sum + r.totals.events, 0);
  const allVisitors = results.reduce((sum, r) => sum + r.totals.visitors, 0);

  return NextResponse.json({
    period: `${clampedDays}d`,
    summary: { realtime: allRealtime, events: allEvents, visitors: allVisitors },
    sites: results,
  });
}
