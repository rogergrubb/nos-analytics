'use client';

export default function TopList({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  const max = items[0]?.count || 1;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">{title}</h3>
      {items.length === 0 ? (
        <div className="text-zinc-600 text-sm py-6 text-center">No data yet</div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 10).map((item) => (
            <div key={item.name} className="relative">
              <div
                className="absolute inset-0 bg-blue-500/10 rounded"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
              <div className="relative flex justify-between px-2 py-1.5 text-sm">
                <span className="truncate mr-2">{item.name}</span>
                <span className="text-zinc-400 font-mono text-xs">{item.count.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
