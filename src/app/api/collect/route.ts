import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_ORIGINS, RATE_LIMIT_MAX } from '@/lib/config';
import { checkRateLimit, storeEvent, calculateBotScore, storeError, Event } from '@/lib/storage';
import { geolocate } from '@/lib/geo';

function cors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get('origin') || '';
  // STRICT: Only exact matches from our allowed list — no wildcards
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return cors(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') || '0.0.0.0';

    // Rate limit (persistent in Turso)
    const allowed = await checkRateLimit(ip, RATE_LIMIT_MAX);
    if (!allowed) {
      return cors(req, NextResponse.json({ error: 'rate limited' }, { status: 429 }));
    }

    let body: any;
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('json')) {
      body = await req.json();
    } else {
      const text = await req.text();
      body = JSON.parse(text);
    }

    if (!body.site || !body.type) {
      return cors(req, NextResponse.json({ error: 'missing fields' }, { status: 400 }));
    }

    // Sanitize site ID (only allow known characters)
    body.site = String(body.site).replace(/[^a-z0-9_-]/gi, '').slice(0, 50);

    // Geo lookup
    const geo = await geolocate(ip);

    const evt: Event = {
      ...body,
      ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      ts: body.ts || Date.now(),
    };

    // Bot detection — score and flag
    const botScore = calculateBotScore(evt);
    evt.botScore = botScore;
    evt.isBot = botScore > 50;

    await storeEvent(evt);

    return cors(req, NextResponse.json({ ok: true }, { status: 200 }));
  } catch (e: any) {
    console.error('collect error:', e.message);
    // Log error persistently
    try { await storeError('system', `collect: ${e.message}`, e.stack); } catch {}
    return cors(req, NextResponse.json({ error: 'server error' }, { status: 500 }));
  }
}
