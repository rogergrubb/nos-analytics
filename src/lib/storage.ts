import { createClient, type Client } from '@libsql/client';

// --- Types ---

export interface Event {
  site: string;
  type: string;
  url: string;
  path: string;
  referrer: string;
  fp: string;
  ts: number;
  deviceType?: string;
  os?: string;
  browser?: string;
  browserVersion?: string;
  screen?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  duration?: number;
  scrollDepth?: number;
  label?: string;
  href?: string;
  tag?: string;
  event?: string;
  userId?: string;
  country?: string;
  region?: string;
  city?: string;
  ip?: string;
}

export interface GeoData {
  country?: string;
  region?: string;
  city?: string;
}

// --- Database ---

let db: Client | null = null;
let initialized = false;

function getDb(): Client {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_TOKEN,
    });
  }
  return db;
}

async function ensureTables() {
  if (initialized) return;
  const client = getDb();
  await client.batch([
    `CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site TEXT,
      type TEXT,
      url TEXT,
      path TEXT,
      referrer TEXT,
      fingerprint TEXT,
      device_type TEXT,
      os TEXT,
      browser TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      duration INTEGER,
      scroll_depth INTEGER,
      label TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS analytics_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site TEXT,
      date TEXT,
      events INTEGER DEFAULT 0,
      visitors INTEGER DEFAULT 0,
      UNIQUE(site, date)
    )`,
  ], 'write');
  initialized = true;
}

// --- Rate limiting (in-memory, same as before) ---

const rateLimits = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(ip: string, max: number): Promise<boolean> {
  const now = Date.now();
  let entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 };
    rateLimits.set(ip, entry);
  }
  entry.count++;
  return entry.count <= max;
}

// --- Public API ---

export async function storeEvent(evt: Event): Promise<void> {
  await ensureTables();
  const client = getDb();
  const day = new Date().toISOString().slice(0, 10);

  await client.batch([
    {
      sql: `INSERT INTO analytics_events (site, type, url, path, referrer, fingerprint, device_type, os, browser, country, region, city, utm_source, utm_medium, utm_campaign, duration, scroll_depth, label)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        evt.site, evt.type, evt.url, evt.path, evt.referrer, evt.fp,
        evt.deviceType ?? null, evt.os ?? null, evt.browser ?? null,
        evt.country ?? null, evt.region ?? null, evt.city ?? null,
        evt.utm_source ?? null, evt.utm_medium ?? null, evt.utm_campaign ?? null,
        evt.duration ?? null, evt.scrollDepth ?? null, evt.label ?? null,
      ],
    },
    {
      sql: `INSERT INTO analytics_daily (site, date, events, visitors)
            VALUES (?, ?, 1, 1)
            ON CONFLICT(site, date) DO UPDATE SET events = events + 1`,
      args: [evt.site, day],
    },
  ], 'write');
}

export async function getRealtimeCount(site: string): Promise<number> {
  await ensureTables();
  const client = getDb();
  const result = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM analytics_events WHERE site = ? AND created_at > datetime('now', '-5 minutes')`,
    args: [site],
  });
  return Number(result.rows[0]?.cnt ?? 0);
}

export async function getDayStats(site: string, day: string) {
  await ensureTables();
  const client = getDb();

  const [eventsR, visitorsR, pagesR, referrersR, countriesR, browsersR, osR, devicesR, campaignsR, hourlyR] =
    await client.batch([
      { sql: `SELECT COUNT(*) as cnt FROM analytics_events WHERE site=? AND date(created_at)=?`, args: [site, day] },
      { sql: `SELECT COUNT(DISTINCT fingerprint) as cnt FROM analytics_events WHERE site=? AND date(created_at)=?`, args: [site, day] },
      { sql: `SELECT path as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND path IS NOT NULL GROUP BY path ORDER BY count DESC LIMIT 20`, args: [site, day] },
      { sql: `SELECT referrer as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND referrer IS NOT NULL AND referrer != '' GROUP BY referrer ORDER BY count DESC LIMIT 20`, args: [site, day] },
      { sql: `SELECT (country || ':' || COALESCE(region,'') || ':' || COALESCE(city,'')) as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND country IS NOT NULL GROUP BY name ORDER BY count DESC LIMIT 50`, args: [site, day] },
      { sql: `SELECT browser as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC LIMIT 10`, args: [site, day] },
      { sql: `SELECT os as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND os IS NOT NULL GROUP BY os ORDER BY count DESC LIMIT 10`, args: [site, day] },
      { sql: `SELECT device_type as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND device_type IS NOT NULL GROUP BY device_type ORDER BY count DESC LIMIT 10`, args: [site, day] },
      { sql: `SELECT (utm_source || '|' || COALESCE(utm_medium,'') || '|' || COALESCE(utm_campaign,'')) as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND utm_source IS NOT NULL GROUP BY name ORDER BY count DESC LIMIT 20`, args: [site, day] },
      { sql: `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? GROUP BY hour`, args: [site, day] },
    ], 'read');

  const hourly = new Array(24).fill(0);
  for (const row of hourlyR.rows) {
    hourly[Number(row.hour)] = Number(row.count);
  }

  const toList = (r: typeof pagesR) => r.rows.map((row) => ({ name: String(row.name), count: Number(row.count) }));
  const events = Number(eventsR.rows[0]?.cnt ?? 0);
  const visitors = Number(visitorsR.rows[0]?.cnt ?? 0);

  return {
    date: day,
    events,
    visitors,
    hourly: hourly.map((count, hour) => ({ hour, count })),
    pages: toList(pagesR),
    referrers: toList(referrersR),
    countries: toList(countriesR),
    browsers: toList(browsersR),
    os: toList(osR),
    devices: toList(devicesR),
    campaigns: toList(campaignsR),
    funnel: { visits: visitors, signups: 0, paid: 0 },
  };
}

export async function getMultiDayStats(site: string, days: number) {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const dailyStats = await Promise.all(dates.map((d) => getDayStats(site, d)));
  const realtime = await getRealtimeCount(site);

  const totals = {
    events: 0,
    visitors: 0,
    pages: new Map<string, number>(),
    referrers: new Map<string, number>(),
    countries: new Map<string, number>(),
    browsers: new Map<string, number>(),
    os: new Map<string, number>(),
    devices: new Map<string, number>(),
    campaigns: new Map<string, number>(),
    funnel: { visits: 0, signups: 0, paid: 0 },
  };

  for (const ds of dailyStats) {
    totals.events += ds.events;
    totals.visitors += ds.visitors;
    totals.funnel.visits += ds.funnel.visits;
    totals.funnel.signups += ds.funnel.signups;
    totals.funnel.paid += ds.funnel.paid;
    for (const list of ['pages', 'referrers', 'countries', 'browsers', 'os', 'devices', 'campaigns'] as const) {
      for (const item of ds[list]) {
        const map = totals[list] as Map<string, number>;
        map.set(item.name, (map.get(item.name) || 0) + item.count);
      }
    }
  }

  function mapToSorted(m: Map<string, number>, limit = 20) {
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ name, count }));
  }

  return {
    site,
    period: `${days}d`,
    realtime,
    totals: { events: totals.events, visitors: totals.visitors },
    daily: dailyStats.map((d) => ({ date: d.date, events: d.events, visitors: d.visitors })).reverse(),
    todayHourly: dailyStats[0]?.hourly || [],
    pages: mapToSorted(totals.pages),
    referrers: mapToSorted(totals.referrers),
    countries: mapToSorted(totals.countries, 50),
    browsers: mapToSorted(totals.browsers, 10),
    os: mapToSorted(totals.os, 10),
    devices: mapToSorted(totals.devices, 10),
    campaigns: mapToSorted(totals.campaigns),
    funnel: totals.funnel,
  };
}
