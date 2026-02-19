'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

function MiniPie({ data, title }: { data: { name: string; count: number }[]; title: string }) {
  if (!data.length) return null;
  return (
    <div>
      <h4 className="text-xs text-zinc-500 mb-2">{title}</h4>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={35} strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {data.slice(0, 4).map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="truncate text-zinc-300">{d.name}</span>
              <span className="text-zinc-500 ml-auto">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DeviceBreakdown({
  browsers, os, devices,
}: {
  browsers: { name: string; count: number }[];
  os: { name: string; count: number }[];
  devices: { name: string; count: number }[];
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
      <h3 className="text-sm font-medium text-zinc-400">Device Breakdown</h3>
      <MiniPie data={devices} title="Device Type" />
      <MiniPie data={browsers} title="Browser" />
      <MiniPie data={os} title="OS" />
    </div>
  );
}
