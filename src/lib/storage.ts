import { kv } from '@vercel/kv';

export interface Event {
  site: string;
  type: string;
  url: string;
  path: string;
  referrer: string;
  fp: string;
  ts: number;
  // device
  deviceType?: string;
  os?: string;
  browser?: string;
  browserVersion?: string;
  screen?: string;
  // utm
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  // engagement
  duration?: number;
  scrollDepth?: number;
  // click
  label?: string;
  href?: string;
  tag?: string;
  // custom event
  event?: string;
  userId?: string;
  // geo (added server-side)
  country?: string;
  region?: string;
  city?: string;
  ip?: string;
}

// Keys
const k = {
  events: (site: string, day: string) => `e:${site}:${day}`,
  visitors: (site: string, day: string) => `v:${site}:${day}`,
  pages: (site: string, day: string) => `p:${site}:${day}`,
  referrers: (site: string, day: string) => `r:${site}:${day}`,
  countries: (site: string, day: string) => `g:${site}:${day}`,
  browsers: (site: string, day: string) => `b:${site}:${day}`,
  os: (site: string, day: string) => `o:${site}:${day}`,
  devices: (site: string, day: string) => `d:${site}:${day}`,
  campaigns: (site: string, day: string) => `c:${site}:${day}`,
  hourly: (site: string, day: string, hour: number) => `h:${site}:${day}:${hour}`,
  realtime: (site: string) => `rt:${site}`,
  rateLimit: (ip: string) => `rl:${ip}`,
  funnelSignup: (site: string, day: string) => `fs:${site}:${day}`,
  funnelPaid: (site: string, day: string) => `fp:${site}:${day}`,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function checkRateLimit(ip: string, max: number): Promise<boolean> {
  const key = k.rateLimit(ip);
  const count = await kv.incr(key);
  if (count === 1) await kv.expire(key, 60);
  return count <= max;
}

export async function storeEvent(evt: Event) {
  const day = today();
  const hour = new Date().getUTCHours();
  const site = evt.site;
  const pipe = kv.pipeline();

  // Event count
  pipe.incr(k.events(site, day));
  // Hourly
  pipe.incr(k.hourly(site, day, hour));
  // Unique visitors (HyperLogLog)
  pipe.pfadd(k.visitors(site, day), evt.fp);
  // Page counts
  if (evt.path) pipe.zincrby(k.pages(site, day), 1, evt.path);
  // Referrer
  if (evt.referrer) {
    try {
      const host = new URL(evt.referrer).hostname;
      pipe.zincrby(k.referrers(site, day), 1, host);
    } catch {}
  }
  // Geo
  if (evt.country) pipe.zincrby(k.countries(site, day), 1, `${evt.country}:${evt.region || ''}:${evt.city || ''}`);
  // Browser/OS/Device
  if (evt.browser) pipe.zincrby(k.browsers(site, day), 1, evt.browser);
  if (evt.os) pipe.zincrby(k.os(site, day), 1, evt.os);
  if (evt.deviceType) pipe.zincrby(k.devices(site, day), 1, evt.deviceType);
  // UTM campaigns
  if (evt.utm_source) pipe.zincrby(k.campaigns(site, day), 1, `${evt.utm_source}|${evt.utm_medium || ''}|${evt.utm_campaign || ''}`);
  // Realtime (sorted set with TTL via score = timestamp)
  pipe.zadd(k.realtime(site), { score: evt.ts, member: `${evt.fp}:${evt.ts}` });
  // Funnel events
  if (evt.event === 'signup') pipe.pfadd(k.funnelSignup(site, day), evt.fp);
  if (evt.event === 'paid' || evt.event === 'purchase') pipe.pfadd(k.funnelPaid(site, day), evt.fp);

  // Set TTL on day keys (90 days)
  const ttl = 90 * 86400;
  const dayKeys = [
    k.events(site, day), k.visitors(site, day), k.pages(site, day),
    k.referrers(site, day), k.countries(site, day), k.browsers(site, day),
    k.os(site, day), k.devices(site, day), k.campaigns(site, day),
    k.hourly(site, day, hour), k.funnelSignup(site, day), k.funnelPaid(site, day),
  ];
  for (const dk of dayKeys) pipe.expire(dk, ttl);
  pipe.expire(k.realtime(site), 300);

  await pipe.exec();
}

export async function getRealtimeCount(site: string): Promise<number> {
  const cutoff = Date.now() - 5 * 60 * 1000;
  // Remove old entries then count
  await kv.zremrangebyscore(k.realtime(site), 0, cutoff);
  return await kv.zcard(k.realtime(site));
}

export async function getDayStats(site: string, day: string) {
  const [events, visitors, pages, referrers, countries, browsers, os, devices, campaigns, funnelSignup, funnelPaid] = await Promise.all([
    kv.get<number>(k.events(site, day)),
    kv.pfcount(k.visitors(site, day)),
    kv.zrange(k.pages(site, day), 0, 19, { rev: true, withScores: true }),
    kv.zrange(k.referrers(site, day), 0, 19, { rev: true, withScores: true }),
    kv.zrange(k.countries(site, day), 0, 49, { rev: true, withScores: true }),
    kv.zrange(k.browsers(site, day), 0, 9, { rev: true, withScores: true }),
    kv.zrange(k.os(site, day), 0, 9, { rev: true, withScores: true }),
    kv.zrange(k.devices(site, day), 0, 9, { rev: true, withScores: true }),
    kv.zrange(k.campaigns(site, day), 0, 19, { rev: true, withScores: true }),
    kv.pfcount(k.funnelSignup(site, day)),
    kv.pfcount(k.funnelPaid(site, day)),
  ]);

  // Hourly data
  const hourlyPromises = Array.from({ length: 24 }, (_, i) => kv.get<number>(k.hourly(site, day, i)));
  const hourlyRaw = await Promise.all(hourlyPromises);
  const hourly = hourlyRaw.map((v, i) => ({ hour: i, count: v || 0 }));

  function parseZRange(arr: any[]): { name: string; count: number }[] {
    const result: { name: string; count: number }[] = [];
    for (let i = 0; i < arr.length; i += 2) {
      result.push({ name: String(arr[i]), count: Number(arr[i + 1]) });
    }
    return result;
  }

  return {
    date: day,
    events: events || 0,
    visitors: visitors || 0,
    hourly,
    pages: parseZRange(pages),
    referrers: parseZRange(referrers),
    countries: parseZRange(countries),
    browsers: parseZRange(browsers),
    os: parseZRange(os),
    devices: parseZRange(devices),
    campaigns: parseZRange(campaigns),
    funnel: { visits: visitors || 0, signups: funnelSignup || 0, paid: funnelPaid || 0 },
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

  // Aggregate
  const totals = {
    events: 0, visitors: 0,
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
