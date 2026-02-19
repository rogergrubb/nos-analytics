'use client';

export default function CampaignTable({ campaigns }: { campaigns: { name: string; count: number }[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">UTM Campaigns</h3>
      {campaigns.length === 0 ? (
        <div className="text-zinc-600 text-sm py-6 text-center">No campaign data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs">
                <th className="text-left pb-2">Source</th>
                <th className="text-left pb-2">Medium</th>
                <th className="text-left pb-2">Campaign</th>
                <th className="text-right pb-2">Hits</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 10).map((c) => {
                const [source, medium, campaign] = c.name.split('|');
                return (
                  <tr key={c.name} className="border-t border-zinc-800/50">
                    <td className="py-1.5 text-zinc-300">{source || '—'}</td>
                    <td className="py-1.5 text-zinc-400">{medium || '—'}</td>
                    <td className="py-1.5 text-zinc-400">{campaign || '—'}</td>
                    <td className="py-1.5 text-right font-mono text-zinc-400">{c.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
