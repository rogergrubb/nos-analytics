'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function HourlyChart({ data }: { data: { hour: number; count: number }[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Today — Hourly</h3>
      {data.length === 0 ? (
        <div className="text-zinc-600 text-sm py-10 text-center">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
            <Bar dataKey="count" name="Events" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
