'use client';

export default function GeoMap({ countries }: { countries: { name: string; count: number }[] }) {
  const max = countries[0]?.count || 1;
  // Parse "Country:Region:City" format
  const countryAgg = new Map<string, number>();
  for (const c of countries) {
    const country = c.name.split(':')[0];
    countryAgg.set(country, (countryAgg.get(country) || 0) + c.count);
  }
  const sorted = [...countryAgg.entries()].sort((a, b) => b[1] - a[1]);
  const topMax = sorted[0]?.[1] || 1;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">🌍 Top Countries</h3>
      {sorted.length === 0 ? (
        <div className="text-zinc-600 text-sm py-6 text-center">No geo data yet</div>
      ) : (
        <div className="space-y-2">
          {sorted.slice(0, 15).map(([country, count]) => (
            <div key={country} className="relative">
              <div
                className="absolute inset-0 bg-green-500/10 rounded"
                style={{ width: `${(count / topMax) * 100}%` }}
              />
              <div className="relative flex justify-between px-2 py-1.5 text-sm">
                <span>{country}</span>
                <span className="text-zinc-400 font-mono text-xs">{count.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Top cities */}
      {countries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <h4 className="text-xs text-zinc-500 mb-2">Top Cities</h4>
          <div className="space-y-1">
            {countries.slice(0, 8).map((c) => {
              const parts = c.name.split(':');
              const city = parts[2] || parts[0];
              return (
                <div key={c.name} className="flex justify-between text-xs">
                  <span className="text-zinc-300">{city}{parts[0] ? `, ${parts[0]}` : ''}</span>
                  <span className="text-zinc-500">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
