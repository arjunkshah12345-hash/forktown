"use client";

import type { Mind } from "@/lib/sim/mind";

function TraitBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between gap-2 font-display text-[10px] uppercase tracking-wider text-ink-soft">
        <span>{label}</span>
        <span className="tele-line">{value.toFixed(2)}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ink)_8%,transparent)]">
        <div
          className="h-full rounded-full bg-canal"
          style={{ width: `${Math.min(100, value * (label.includes("λ") ? 28 : 100))}%` }}
        />
      </div>
    </div>
  );
}

export function MindCard({ mind }: { mind: Mind }) {
  const topMem = mind.memories.slice().sort((a, b) => b.salience - a.salience)[0];
  return (
    <article className="rounded-2xl border border-[var(--hairline)] bg-white/55 px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-base font-semibold tracking-tight">{mind.name}</h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">{mind.role}</span>
      </div>
      {mind.segment && (
        <p className="mt-0.5 text-xs text-ink-soft">{mind.segment} · ref {(mind.referencePoint * 100).toFixed(0)}%</p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <TraitBar label="λ loss aversion" value={mind.personality.lossAversion} />
        <TraitBar label="status quo" value={mind.personality.statusQuoBias} />
        <TraitBar label="trust" value={mind.affect.trust} />
        <TraitBar label="anger" value={mind.affect.anger} />
      </div>
      {topMem && (
        <p className="mt-3 border-t border-[var(--hairline)] pt-2 text-sm leading-snug text-ink-soft">
          “{topMem.summary}”
        </p>
      )}
    </article>
  );
}
