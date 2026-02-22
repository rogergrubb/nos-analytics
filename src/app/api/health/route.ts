import { NextResponse } from 'next/server';

let dbOk = false;

export async function GET() {
  const start = Date.now();

  // Check database connectivity
  try {
    const { createClient } = await import('@libsql/client');
    const db = createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_TOKEN,
    });
    await db.execute('SELECT 1');
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const latency = Date.now() - start;
  const status = dbOk ? 'healthy' : 'degraded';

  const res = NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbOk ? 'ok' : 'error',
      latency_ms: latency,
    },
  }, { status: dbOk ? 200 : 503 });

  // Allow uptime monitors to hit this without auth
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
