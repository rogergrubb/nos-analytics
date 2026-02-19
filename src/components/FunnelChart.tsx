'use client';

export default function FunnelChart({ funnel }: { funnel?: { visits: number; signups: number; paid: number } }) {
  if (!funnel) return null;
  const steps = [
    { label: 'Visits', value: funnel.visits, color: 'bg-blue-500' },
    { label: 'Signups', value: funnel.signups, color: 'bg-amber-500' },
    { label: 'Paid', value: funnel.paid, color: 'bg-green-500' },
  ];
  const max = Math.max(funnel.visits, 1);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">Conversion Funnel</h3>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const pct = ((step.value / max) * 100).toFixed(1);
          const convRate = i > 0 && steps[i - 1].value > 0
            ? ((step.value / steps[i - 1].value) * 100).toFixed(1)
            : null;
          return (
            <div key={step.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{step.label}</span>
                <span className="text-zinc-400">
                  {step.value.toLocaleString()}
                  {convRate && <span className="text-zinc-500 text-xs ml-1">({convRate}%)</span>}
                </span>
              </div>
              <div className="h-6 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${step.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
