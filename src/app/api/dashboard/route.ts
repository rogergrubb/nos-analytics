import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_PASSWORD, SITES } from '@/lib/config';
import { getMultiDayStats, getRealtimeCount } from '@/lib/storage';

function isAuthed(req: NextRequest): boolean {
  const cookie = req.cookies.get('nos-auth')?.value;
  if (cookie && Buffer.from(cookie, 'base64').toString() === DASHBOARD_PASSWORD) return true;
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
      return { site, ...stats };
    })
  );

  // Aggregate all sites
  const allRealtime = results.reduce((sum, r) => sum + r.realtime, 0);
  const allEvents = results.reduce((sum, r) => sum + r.totals.events, 0);
  const allVisitors = results.reduce((sum, r) => sum + r.totals.visitors, 0);

  return NextResponse.json({
    period: `${clampedDays}d`,
    summary: { realtime: allRealtime, events: allEvents, visitors: allVisitors },
    sites: results,
  });
}
