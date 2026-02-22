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
  isBot?: boolean;
  botScore?: number;
  errorMessage?: string;
  errorStack?: string;
  errorSource?: string;
  errorLine?: number;
  errorCol?: number;
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
      event_name TEXT,
      user_id TEXT,
      is_bot INTEGER DEFAULT 0,
      bot_score REAL DEFAULT 0,
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
    `CREATE TABLE IF NOT EXISTS analytics_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site TEXT,
      type TEXT,
      fingerprint TEXT,
      user_id TEXT,
      amount REAL,
      plan TEXT,
      currency TEXT DEFAULT 'usd',
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS analytics_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site TEXT,
      error_message TEXT,
      error_stack TEXT,
      error_source TEXT,
      error_line INTEGER,
      error_col INTEGER,
      url TEXT,
      browser TEXT,
      os TEXT,
      fingerprint TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS analytics_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      ip TEXT,
      user_agent TEXT,
      success INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS analytics_rate_limits (
      ip TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      window_start TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  ], 'write');

  // Create indexes (safe to run multiple times)
  try {
    await client.batch([
      `CREATE INDEX IF NOT EXISTS idx_events_site_date ON analytics_events(site, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(type)`,
      `CREATE INDEX IF NOT EXISTS idx_conversions_site ON analytics_conversions(site, type, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_errors_site ON analytics_errors(site, created_at)`,
    ], 'write');
  } catch { /* indexes may already exist */ }

  initialized = true;
}

// --- Rate limiting (persistent in Turso) ---

export async function checkRateLimit(ip: string, max: number): Promise<boolean> {
  await ensureTables();
  const client = getDb();
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

  try {
    await client.execute({
      sql: `DELETE FROM analytics_rate_limits WHERE window_start < ?`,
      args: [oneMinuteAgo],
    });
    await client.execute({
      sql: `INSERT INTO analytics_rate_limits (ip, count, window_start) VALUES (?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(ip) DO UPDATE SET count = count + 1`,
      args: [ip],
    });
    const result = await client.execute({
      sql: `SELECT count FROM analytics_rate_limits WHERE ip = ?`,
      args: [ip],
    });
    return Number(result.rows[0]?.count ?? 0) <= max;
  } catch {
    return true; // fail open
  }
}

// --- Bot Detection ---

export function calculateBotScore(evt: Event): number {
  let score = 0;
  if (!evt.fp || evt.fp.length < 3) score += 30;
  if (!evt.browser || evt.browser === 'Unknown') score += 15;
  if (!evt.os || evt.os === 'Unknown') score += 15;
  if (!evt.screen) score += 10;
  const suspiciousReferrers = ['semalt.com', 'buttons-for-website.com', 'darodar.com', 'ilovevitaly.com'];
  if (evt.referrer && suspiciousReferrers.some(r => evt.referrer.includes(r))) score += 40;
  if (evt.deviceType === undefined && evt.os === undefined) score += 20;
  const drift = Math.abs(Date.now() - (evt.ts || Date.now()));
  if (drift > 86400000) score += 25;
  return Math.min(score, 100);
}

// --- Audit Logging ---

export async function logAudit(action: string, ip: string, userAgent: string, success: boolean): Promise<void> {
  await ensureTables();
  const client = getDb();
  try {
    await client.execute({
      sql: `INSERT INTO analytics_audit_log (action, ip, user_agent, success) VALUES (?, ?, ?, ?)`,
      args: [action, ip, userAgent, success ? 1 : 0],
    });
  } catch { /* never break main flow */ }
}

// --- Store Events ---

export async function storeEvent(evt: Event): Promise<void> {
  await ensureTables();
  const client = getDb();
  const day = new Date().toISOString().slice(0, 10);

  // Conversion events → dedicated table
  if (evt.type === 'event' && (evt.event === 'signup' || evt.event === 'paid')) {
    await client.execute({
      sql: `INSERT INTO analytics_conversions (site, type, fingerprint, user_id, amount, plan, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        evt.site, evt.event, evt.fp, evt.userId ?? null,
        (evt as any).amount ?? null, (evt as any).plan ?? null,
        JSON.stringify({ utm_source: evt.utm_source, utm_medium: evt.utm_medium, utm_campaign: evt.utm_campaign }),
      ],
    });
  }

  // Error events → error table only
  if (evt.type === 'error') {
    await client.execute({
      sql: `INSERT INTO analytics_errors (site, error_message, error_stack, error_source, error_line, error_col, url, browser, os, fingerprint)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        evt.site, evt.errorMessage ?? null, evt.errorStack ?? null,
        evt.errorSource ?? null, evt.errorLine ?? null, evt.errorCol ?? null,
        evt.url, evt.browser ?? null, evt.os ?? null, evt.fp,
      ],
    });
    return;
  }

  // Skip high-confidence bots
  if (evt.botScore && evt.botScore > 70) return;

  await client.batch([
    {
      sql: `INSERT INTO analytics_events (site, type, url, path, referrer, fingerprint, device_type, os, browser, country, region, city, utm_source, utm_medium, utm_campaign, duration, scroll_depth, label, event_name, user_id, is_bot, bot_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        evt.site, evt.type, evt.url, evt.path, evt.referrer, evt.fp,
        evt.deviceType ?? null, evt.os ?? null, evt.browser ?? null,
        evt.country ?? null, evt.region ?? null, evt.city ?? null,
        evt.utm_source ?? null, evt.utm_medium ?? null, evt.utm_campaign ?? null,
        evt.duration ?? null, evt.scrollDepth ?? null, evt.label ?? null,
        evt.event ?? null, evt.userId ?? null,
        evt.isBot ? 1 : 0, evt.botScore ?? 0,
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

// --- Error Logging ---

export async function storeError(site: string, message: string, stack?: string): Promise<void> {
  await ensureTables();
  const client = getDb();
  try {
    await client.execute({
      sql: `INSERT INTO analytics_errors (site, error_message, error_stack) VALUES (?, ?, ?)`,
      args: [site, message, stack ?? null],
    });
  } catch { /* never throw */ }
}

// --- Queries ---

export async function getRealtimeCount(site: string): Promise<number> {
  await ensureTables();
  const client = getDb();
  const result = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM analytics_events WHERE site = ? AND created_at > datetime('now', '-5 minutes') AND is_bot = 0`,
    args: [site],
  });
  return Number(result.rows[0]?.cnt ?? 0);
}

async function getFunnelData(site: string, startDate: string, endDate: string) {
  await ensureTables();
  const client = getDb();
  const [visitorsR, signupsR, paidR] = await client.batch([
    { sql: `SELECT COUNT(DISTINCT fingerprint) as cnt FROM analytics_events WHERE site=? AND date(created_at) BETWEEN ? AND ? AND type='pageview' AND is_bot=0`, args: [site, startDate, endDate] },
    { sql: `SELECT COUNT(DISTINCT fingerprint) as cnt FROM analytics_conversions WHERE site=? AND type='signup' AND date(created_at) BETWEEN ? AND ?`, args: [site, startDate, endDate] },
    { sql: `SELECT COUNT(DISTINCT fingerprint) as cnt FROM analytics_conversions WHERE site=? AND type='paid' AND date(created_at) BETWEEN ? AND ?`, args: [site, startDate, endDate] },
  ], 'read');
  return {
    visits: Number(visitorsR.rows[0]?.cnt ?? 0),
    signups: Number(signupsR.rows[0]?.cnt ?? 0),
    paid: Number(paidR.rows[0]?.cnt ?? 0),
  };
}

export async function getRecentErrors(site: string, limit = 20) {
  await ensureTables();
  const client = getDb();
  const result = await client.execute({
    sql: `SELECT error_message, error_source, url, browser, os, created_at FROM analytics_errors WHERE site=? ORDER BY created_at DESC LIMIT ?`,
    args: [site, limit],
  });
  return result.rows;
}

export async function getRecentAuditLogs(limit = 50) {
  await ensureTables();
  const client = getDb();
  const result = await client.execute({
    sql: `SELECT action, ip, user_agent, success, created_at FROM analytics_audit_log ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows;
}

export async function cleanupOldData(): Promise<{ deleted: number }> {
  await ensureTables();
  const client = getDb();
  const results = await client.batch([
    `DELETE FROM analytics_events WHERE created_at < datetime('now', '-90 days')`,
    `DELETE FROM analytics_daily WHERE date < date('now', '-90 days')`,
    `DELETE FROM analytics_conversions WHERE created_at < datetime('now', '-90 days')`,
    `DELETE FROM analytics_errors WHERE created_at < datetime('now', '-30 days')`,
    `DELETE FROM analytics_audit_log WHERE created_at < datetime('now', '-90 days')`,
    `DELETE FROM analytics_rate_limits WHERE window_start < datetime('now', '-1 hour')`,
  ], 'write');
  const deleted = results.reduce((sum, r) => sum + (r.rowsAffected ?? 0), 0);
  return { deleted };
}

export async function getDayStats(site: string, day: string) {
  await ensureTables();
  const client = getDb();

  const [eventsR, visitorsR, pagesR, referrersR, countriesR, browsersR, osR, devicesR, campaignsR, hourlyR] =
    await client.batch([
      { sql: `SELECT COUNT(*) as cnt FROM analytics_events WHERE site=? AND date(created_at)=? AND is_bot=0`, args: [site, day] },
      { sql: `SELECT COUNT(DISTINCT fingerprint) as cnt FROM analytics_events WHERE site=? AND date(created_at)=? AND is_bot=0`, args: [site, day] },
      { sql: `SELECT path as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND path IS NOT NULL AND is_bot=0 GROUP BY path ORDER BY count DESC LIMIT 20`, args: [site, day] },
      { sql: `SELECT referrer as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND referrer IS NOT NULL AND referrer != '' AND is_bot=0 GROUP BY referrer ORDER BY count DESC LIMIT 20`, args: [site, day] },
      { sql: `SELECT (country || ':' || COALESCE(region,'') || ':' || COALESCE(city,'')) as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND country IS NOT NULL AND is_bot=0 GROUP BY name ORDER BY count DESC LIMIT 50`, args: [site, day] },
      { sql: `SELECT browser as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND browser IS NOT NULL AND is_bot=0 GROUP BY browser ORDER BY count DESC LIMIT 10`, args: [site, day] },
      { sql: `SELECT os as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND os IS NOT NULL AND is_bot=0 GROUP BY os ORDER BY count DESC LIMIT 10`, args: [site, day] },
      { sql: `SELECT device_type as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND device_type IS NOT NULL AND is_bot=0 GROUP BY device_type ORDER BY count DESC LIMIT 10`, args: [site, day] },
      { sql: `SELECT (utm_source || '|' || COALESCE(utm_medium,'') || '|' || COALESCE(utm_campaign,'')) as name, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND utm_source IS NOT NULL AND is_bot=0 GROUP BY name ORDER BY count DESC LIMIT 20`, args: [site, day] },
      { sql: `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count FROM analytics_events WHERE site=? AND date(created_at)=? AND is_bot=0 GROUP BY hour`, args: [site, day] },
    ], 'read');

  const hourly = new Array(24).fill(0);
  for (const row of hourlyR.rows) hourly[Number(row.hour)] = Number(row.count);

  const toList = (r: typeof pagesR) => r.rows.map((row) => ({ name: String(row.name), count: Number(row.count) }));
  const funnel = await getFunnelData(site, day, day);

  return {
    date: day,
    events: Number(eventsR.rows[0]?.cnt ?? 0),
    visitors: Number(visitorsR.rows[0]?.cnt ?? 0),
    hourly: hourly.map((count, hour) => ({ hour, count })),
    pages: toList(pagesR),
    referrers: toList(referrersR),
    countries: toList(countriesR),
    browsers: toList(browsersR),
    os: toList(osR),
    devices: toList(devicesR),
    campaigns: toList(campaignsR),
    funnel,
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
  const startDate = dates[dates.length - 1];
  const endDate = dates[0];
  const periodFunnel = await getFunnelData(site, startDate, endDate);

  const totals = {
    events: 0, visitors: 0,
    pages: new Map<string, number>(), referrers: new Map<string, number>(),
    countries: new Map<string, number>(), browsers: new Map<string, number>(),
    os: new Map<string, number>(), devices: new Map<string, number>(),
    campaigns: new Map<string, number>(),
  };

  for (const ds of dailyStats) {
    totals.events += ds.events;
    totals.visitors += ds.visitors;
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
    site, period: `${days}d`, realtime,
    totals: { events: totals.events, visitors: totals.visitors },
    daily: dailyStats.map((d) => ({ date: d.date, events: d.events, visitors: d.visitors })).reverse(),
    todayHourly: dailyStats[0]?.hourly || [],
    pages: mapToSorted(totals.pages), referrers: mapToSorted(totals.referrers),
    countries: mapToSorted(totals.countries, 50), browsers: mapToSorted(totals.browsers, 10),
    os: mapToSorted(totals.os, 10), devices: mapToSorted(totals.devices, 10),
    campaigns: mapToSorted(totals.campaigns), funnel: periodFunnel,
  };
}
