import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldData, storeError } from '@/lib/storage';

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await cleanupOldData();
    console.log(`[cron] Cleanup complete: ${result.deleted} rows deleted`);
    return NextResponse.json({ ok: true, deleted: result.deleted });
  } catch (e: any) {
    console.error('[cron] Cleanup failed:', e.message);
    await storeError('system', `cron cleanup failed: ${e.message}`, e.stack);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
