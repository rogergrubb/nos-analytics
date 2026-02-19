'use client';

export default function StatsCards({ data }: { data: any }) {
  const cards = [
    { label: 'Realtime Visitors', value: data.realtime ?? data.summary?.realtime ?? 0, icon: '🟢', color: 'text-green-400' },
    { label: 'Total Pageviews', value: data.totals?.events ?? 0, icon: '👁️', color: 'text-blue-400' },
    { label: 'Unique Visitors', value: data.totals?.visitors ?? 0, icon: '👤', color: 'text-purple-400' },
    { label: 'Signups', value: data.funnel?.signups ?? 0, icon: '✍️', color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
            <span>{c.icon}</span>
            {c.label}
          </div>
          <div className={`text-3xl font-bold ${c.color}`}>
            {typeof c.value === 'number' ? c.value.toLocaleString() : c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
