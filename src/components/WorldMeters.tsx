import type { WorldSnapshot } from "@/lib/sim/types";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function WorldMeters({ world }: { world: WorldSnapshot }) {
  const items = [
    { label: "Synthetic customers", value: fmt(world.customers) },
    { label: "Traffic", value: `${fmt(world.trafficRps)} rps` },
    { label: "Open tickets", value: fmt(world.activeTickets) },
    { label: "Incidents", value: fmt(world.activeIncidents) },
    { label: "Revenue at risk", value: `$${fmt(world.revenueAtRisk)}` },
    { label: "Legacy contracts", value: fmt(world.legacyContracts) },
    { label: "Outage", value: `${world.outagePercent}%` },
    ...(world.meanTrust != null
      ? [
          { label: "Mean trust", value: `${(world.meanTrust * 100).toFixed(0)}%` },
          { label: "Mean anger", value: `${((world.meanAnger ?? 0) * 100).toFixed(0)}%` },
          { label: "Churn-intent", value: fmt(world.churnIntent ?? 0) },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <p className="font-display text-[10px] uppercase tracking-[0.14em] text-ink-soft">{it.label}</p>
          <p className="font-display tele-line mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}
