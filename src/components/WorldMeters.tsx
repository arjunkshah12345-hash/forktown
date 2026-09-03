import type { WorldSnapshot } from "@/lib/sim/types";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function WorldMeters({ world }: { world: WorldSnapshot }) {
  const items = [
    { label: "Villagers", value: fmt(world.customers), icon: "☺" },
    { label: "Traffic", value: `${fmt(world.trafficRps)} rps`, icon: "»" },
    { label: "Tickets", value: fmt(world.activeTickets), icon: "✉" },
    { label: "Incidents", value: fmt(world.activeIncidents), icon: "⚠" },
    { label: "At risk", value: `$${fmt(world.revenueAtRisk)}`, icon: "$" },
    { label: "Legacy", value: fmt(world.legacyContracts), icon: "¤" },
    { label: "Outage", value: `${world.outagePercent}%`, icon: "⌁" },
    ...(world.meanTrust != null
      ? [
          { label: "Trust", value: `${(world.meanTrust * 100).toFixed(0)}%`, icon: "♥" },
          { label: "Anger", value: `${((world.meanAnger ?? 0) * 100).toFixed(0)}%`, icon: "✸" },
          { label: "Churn", value: fmt(world.churnIntent ?? 0), icon: "↓" },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {items.map((it) => (
        <div key={it.label} className="px-stat min-w-0">
          <p className="k">
            <span className="mr-1 text-[var(--px-gold)]">{it.icon}</span>
            {it.label}
          </p>
          <p className="v !text-[0.7rem] sm:!text-[0.85rem]">{it.value}</p>
        </div>
      ))}
    </div>
  );
}
