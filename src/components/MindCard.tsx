"use client";

import type { Mind } from "@/lib/sim/mind";
import { PixelPortrait } from "@/components/retro/PixelPortrait";

function TraitBar({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  const pct = Math.min(100, value * (label.includes("λ") ? 28 : 100));
  return (
    <div>
      <div className="flex justify-between gap-2 font-pixel text-[0.38rem] uppercase tracking-wide text-[#bcaaa4]">
        <span>{label}</span>
        <span className="text-[var(--px-gold)]">{value.toFixed(2)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden border-2 border-[var(--px-shadow)] bg-[#1a0f0a]">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: danger ? "var(--px-danger)" : "var(--px-mana)",
            boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.25)",
          }}
        />
      </div>
    </div>
  );
}

export function MindCard({ mind }: { mind: Mind }) {
  const topMem = mind.memories.slice().sort((a, b) => b.salience - a.salience)[0];
  const portrait =
    mind.role.includes("agent") || mind.name === "Forge"
      ? "agent"
      : mind.affect.anger > 0.55
        ? "angry"
        : mind.role.includes("sre") || mind.role.includes("attacker")
          ? "sre"
          : "buyer";

  return (
    <article className="pixel-dialogue-card">
      <div className="flex gap-3">
        <div className="pixel-dialogue-portrait shrink-0">
          <PixelPortrait type={portrait} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-pixel text-[0.5rem] leading-relaxed text-[var(--px-gold)]">{mind.name}</h3>
            <span className="font-pixel text-[0.35rem] uppercase text-[#bcaaa4]">{mind.role}</span>
          </div>
          {mind.segment && (
            <p className="mt-1 font-retro text-[1.05rem] text-[#d7ccc8]">
              {mind.segment} · ref {(mind.referencePoint * 100).toFixed(0)}%
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <TraitBar label="λ loss" value={mind.personality.lossAversion} />
        <TraitBar label="status quo" value={mind.personality.statusQuoBias} />
        <TraitBar label="trust" value={mind.affect.trust} />
        <TraitBar label="anger" value={mind.affect.anger} danger />
      </div>
      {topMem && (
        <p className="mt-3 border-t-2 border-[var(--px-border)] pt-2 font-retro text-[1.1rem] leading-snug text-[#fff8e7]">
          “{topMem.summary}”
        </p>
      )}
    </article>
  );
}
