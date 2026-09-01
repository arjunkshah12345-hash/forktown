"use client";

import { motion } from "framer-motion";
import type { District } from "@/lib/sim/types";
import clsx from "clsx";

const KIND_COLOR: Record<District["kind"], string> = {
  billing: "#d4920a",
  auth: "#4a6d8c",
  api: "#3d8a64",
  data: "#6b5b95",
  support: "#c45c12",
  finance: "#2f6b4f",
  security: "#b33a2e",
  edge: "#5a7a8c",
};

export function TownMap({
  districts,
  highlightIds,
  className,
  live,
  pulseLabel,
}: {
  districts: District[];
  highlightIds?: string[];
  className?: string;
  live?: boolean;
  pulseLabel?: string;
}) {
  const hl = new Set(highlightIds ?? []);

  return (
    <div
      className={clsx(
        "map-grid relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[color-mix(in_oklab,white_40%,var(--fog))]",
        className,
      )}
    >
      {pulseLabel && (
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex justify-center">
          <motion.p
            key={pulseLabel}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[90%] truncate rounded-full border border-[var(--hairline)] bg-ink/90 px-4 py-1.5 font-display text-xs font-medium text-paper shadow-[var(--shadow-soft)]"
          >
            {pulseLabel}
          </motion.p>
        </div>
      )}

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" aria-hidden>
        {districts.flatMap((d) =>
          d.dependencies.map((depId) => {
            const target = districts.find((x) => x.id === depId);
            if (!target) return null;
            return (
              <line
                key={`${d.id}-${depId}`}
                x1={`${d.x}%`}
                y1={`${d.y}%`}
                x2={`${target.x}%`}
                y2={`${target.y}%`}
                stroke="var(--canal)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            );
          }),
        )}
      </svg>

      {districts.map((d, i) => {
        const color = KIND_COLOR[d.kind];
        const size = 14 + d.load * 22;
        const stressed = d.health < 0.75 || hl.has(d.id);
        return (
          <motion.button
            type="button"
            key={d.id}
            className="district-dot group"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: size,
              height: size,
              background: color,
              color,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: live && stressed ? [1, 1.15, 1] : 1,
              opacity: 1,
            }}
            transition={{
              delay: 0.03 * i,
              duration: live && stressed ? 1.8 : 0.55,
              ease: [0.32, 0.72, 0, 1],
              repeat: live && stressed ? Infinity : 0,
            }}
            title={`${d.name} · ${d.kind}`}
          >
            <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/90 px-2 py-0.5 font-display text-[10px] font-medium text-paper opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {d.name}
            </span>
          </motion.button>
        );
      })}

      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
        {(Object.keys(KIND_COLOR) as District["kind"][]).map((k) => (
          <span
            key={k}
            className="font-display inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-1 text-[10px] uppercase tracking-wider text-ink-soft backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_COLOR[k] }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
