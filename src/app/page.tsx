'use client';

import { useState, useEffect, useCallback } from 'react';
import { SITE_LABELS } from './dashboard-config';
import StatsCards from '@/components/StatsCards';
import TrafficChart from '@/components/TrafficChart';
import HourlyChart from '@/components/HourlyChart';
import TopList from '@/components/TopList';
import DeviceBreakdown from '@/components/DeviceBreakdown';
import GeoMap from '@/components/GeoMap';
import FunnelChart from '@/components/FunnelChart';
import CampaignTable from '@/components/CampaignTable';

export default function Dashboard() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { setAuthed(true); setError(''); }
    else setError('Wrong password');
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedSite === 'all'
        ? `/api/dashboard?days=${days}`
        : `/api/dashboard/${selectedSite}?days=${days}`;
      const res = await fetch(url);
      if (res.status === 401) { setAuthed(false); return; }
      setData(await res.json());
    } catch (e) {
      console.error('fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [selectedSite, days]);

  useEffect(() => {
    if (authed) fetchData();
    const interval = setInterval(() => { if (authed) fetchData(); }, 60000);
    return () => clearInterval(interval);
  }, [authed, fetchData]);

  // Check if already authed
  useEffect(() => {
    fetch('/api/dashboard?days=1').then(r => { if (r.ok) setAuthed(true); });
  }, []);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form onSubmit={login} className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-1">NOS Analytics</h1>
          <p className="text-zinc-500 text-sm mb-6">NumberOneSon Software</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 mb-4 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 font-medium transition-colors">
            Sign In
          </button>
          <div className="mt-4 text-center">
            <a href="/privacy" className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">
              Privacy Policy
            </a>
          </div>
        </form>
      </div>
    );
  }

  const siteData = selectedSite === 'all' && data?.sites
    ? aggregateSites(data.sites)
    : data;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📊 NOS Analytics</h1>
            <p className="text-zinc-500 text-xs">NumberOneSon Software</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Site selector */}
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            >
              <option value="all">All Sites</option>
              {Object.entries(SITE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            {/* Period selector */}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            >
              <option value={1}>Today</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button onClick={fetchData} className="text-zinc-400 hover:text-white text-sm" disabled={loading}>
              {loading ? '⏳' : '🔄'}
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {!siteData ? (
          <div className="text-center text-zinc-500 py-20">Loading analytics data...</div>
        ) : (
          <>
            <StatsCards data={siteData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrafficChart data={siteData.daily || []} />
              <HourlyChart data={siteData.todayHourly || []} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TopList title="Top Pages" items={siteData.pages || []} />
              <TopList title="Top Referrers" items={siteData.referrers || []} />
              <GeoMap countries={siteData.countries || []} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DeviceBreakdown browsers={siteData.browsers || []} os={siteData.os || []} devices={siteData.devices || []} />
              <FunnelChart funnel={siteData.funnel} />
              <CampaignTable campaigns={siteData.campaigns || []} />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 mt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-zinc-600 text-xs">
          <span>© {new Date().getFullYear()} NumberOneSon Software</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <a href="/api/health" target="_blank" className="hover:text-zinc-400 transition-colors">System Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function aggregateSites(sites: any[]) {
  const agg: any = {
    realtime: 0,
    totals: { events: 0, visitors: 0 },
    daily: [],
    todayHourly: [],
    pages: [],
    referrers: [],
    countries: [],
    browsers: [],
    os: [],
    devices: [],
    campaigns: [],
    funnel: { visits: 0, signups: 0, paid: 0 },
  };

  const maps: Record<string, Map<string, number>> = {
    pages: new Map(), referrers: new Map(), countries: new Map(),
    browsers: new Map(), os: new Map(), devices: new Map(), campaigns: new Map(),
  };
  const dailyMap = new Map<string, { events: number; visitors: number }>();
  const hourlyArr = Array(24).fill(0);

  for (const site of sites) {
    agg.realtime += site.realtime || 0;
    agg.totals.events += site.totals?.events || 0;
    agg.totals.visitors += site.totals?.visitors || 0;
    agg.funnel.visits += site.funnel?.visits || 0;
    agg.funnel.signups += site.funnel?.signups || 0;
    agg.funnel.paid += site.funnel?.paid || 0;

    for (const d of site.daily || []) {
      const existing = dailyMap.get(d.date) || { events: 0, visitors: 0 };
      dailyMap.set(d.date, { events: existing.events + d.events, visitors: existing.visitors + d.visitors });
    }
    for (const h of site.todayHourly || []) {
      hourlyArr[h.hour] = (hourlyArr[h.hour] || 0) + h.count;
    }
    for (const key of Object.keys(maps)) {
      for (const item of site[key] || []) {
        maps[key].set(item.name, (maps[key].get(item.name) || 0) + item.count);
      }
    }
  }

  agg.daily = [...dailyMap.entries()].sort().map(([date, v]) => ({ date, ...v }));
  agg.todayHourly = hourlyArr.map((count, hour) => ({ hour, count }));
  for (const key of Object.keys(maps)) {
    agg[key] = [...maps[key].entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }));
  }

  return agg;
}
