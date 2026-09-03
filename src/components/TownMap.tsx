"use client";

import { motion } from "framer-motion";
import type { District } from "@/lib/sim/types";
import clsx from "clsx";

const KIND_COLOR: Record<District["kind"], string> = {
  billing: "#f9a825",
  auth: "#42a5f5",
  api: "#66bb6a",
  data: "#8d6e63",
  support: "#ef6c00",
  finance: "#558b2f",
  security: "#e53935",
  edge: "#7e57c2",
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
    <div className={clsx("map-grid relative overflow-hidden", className)}>
      {/* sky strip */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28%]"
        style={{
          background: "linear-gradient(180deg, #7ec8f7 0%, #a8d8f0 70%, transparent 100%)",
        }}
      />

      {pulseLabel && (
        <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex justify-center">
          <motion.p
            key={pulseLabel}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-[90%] truncate border-4 border-[var(--border-hi)] bg-[var(--soil)] px-3 py-1.5 font-pixel text-[0.42rem] text-[var(--amber)] shadow-[3px_3px_0_var(--shadow)]"
          >
            {pulseLabel}
          </motion.p>
        </div>
      )}

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-50" aria-hidden>
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
                stroke="#fff8e7"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            );
          }),
        )}
      </svg>

      {districts.map((d, i) => {
        const color = KIND_COLOR[d.kind];
        const size = 18 + d.load * 20;
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
              height: size * 0.85,
              background: color,
              color,
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: live && stressed ? [1, 1.12, 1] : 1,
              opacity: 1,
            }}
            transition={{
              delay: 0.02 * i,
              duration: live && stressed ? 0.8 : 0.25,
              ease: "linear",
              repeat: live && stressed ? Infinity : 0,
            }}
            title={`${d.name} · ${d.kind}`}
          >
            <span className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] -translate-x-1/2 whitespace-nowrap border-2 border-[var(--border)] bg-[var(--soil)] px-1.5 py-0.5 font-pixel text-[0.35rem] text-[var(--paper)] opacity-0 group-hover:opacity-100">
              {d.name}
            </span>
          </motion.button>
        );
      })}

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
        {(Object.keys(KIND_COLOR) as District["kind"][]).map((k) => (
          <span key={k} className="px-chip">
            <span className="inline-block h-2 w-2" style={{ background: KIND_COLOR[k] }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
