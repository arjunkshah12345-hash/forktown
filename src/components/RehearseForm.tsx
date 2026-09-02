"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MigrationKind } from "@/lib/sim/types";
import type { MigrationPlaybook } from "@/lib/github/playbook";
import { withBase } from "@/lib/paths";

const KINDS = [
  { id: "billing", label: "Billing migration", hint: "Checkout → custom invoices" },
  { id: "auth", label: "Auth migration", hint: "Sessions, IdP, MFA" },
  { id: "database", label: "Database migration", hint: "Schema, dual-write, backfill" },
  { id: "framework", label: "Framework upgrade", hint: "Runtime / major version" },
  { id: "api_version", label: "API version change", hint: "v1 → v2 with clients" },
] as const;

export function RehearseForm({
  townId,
  playbooks = [],
  defaultKind,
}: {
  townId: string;
  playbooks?: MigrationPlaybook[];
  defaultKind?: MigrationKind;
}) {
  const router = useRouter();
  const initial = playbooks.find((p) => p.kind === defaultKind) ?? playbooks[0];
  const [kind, setKind] = useState<MigrationKind>(initial?.kind ?? defaultKind ?? "billing");
  const [title, setTitle] = useState(initial?.title ?? "Migration rehearsal");
  const [hypothesis, setHypothesis] = useState(
    initial?.hypothesis ?? "Dual-write + cohort flags should survive subjective town pressure.",
  );
  const [agentName, setAgentName] = useState("Forge");
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(initial?.intensity ?? 3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPlaybook(k: MigrationKind) {
    const pb = playbooks.find((p) => p.kind === k);
    setKind(k);
    if (pb) {
      setTitle(pb.title);
      setHypothesis(pb.hypothesis);
      setIntensity(pb.intensity);
    }
  }

  const activeRationale = playbooks.find((p) => p.kind === kind)?.rationale;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(withBase(`/api/towns/${townId}/rehearse`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, hypothesis, agentName, intensity, runNow: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Failed");
      router.push(`/runs/${data.run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {playbooks.length > 0 && (
        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--canal)_30%,transparent)] bg-[color-mix(in_oklab,var(--canal)_6%,white)] px-4 py-3">
          <p className="font-display text-xs uppercase tracking-[0.14em] text-ink-soft">
            Repo-aware playbook
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {activeRationale ?? "Fingerprinted migrations pre-fill title, hypothesis, and intensity."}
          </p>
        </div>
      )}

      <fieldset>
        <legend className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Migration kind</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => applyPlaybook(k.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                kind === k.id
                  ? "border-ink bg-ink text-paper"
                  : "border-[var(--hairline)] bg-white/50 hover:bg-white/80"
              }`}
            >
              <p className="font-display text-sm font-semibold">{k.label}</p>
              <p className={`mt-0.5 text-sm ${kind === k.id ? "text-paper/70" : "text-ink-soft"}`}>{k.hint}</p>
              {playbooks.some((p) => p.kind === k.id) && (
                <p className={`font-mono mt-1 text-[10px] uppercase ${kind === k.id ? "text-paper/50" : "text-canal"}`}>
                  detected in repo
                </p>
              )}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Title</span>
        <input
          className="font-display mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-white/70 px-4 py-3 text-ink outline-none focus:border-ink/30"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>

      <label className="block">
        <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Hypothesis</span>
        <textarea
          className="mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-white/70 px-4 py-3 text-[15px] leading-relaxed text-ink outline-none focus:border-ink/30"
          rows={3}
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          required
        />
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Agent name</span>
          <input
            className="font-display mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-white/70 px-4 py-3 outline-none focus:border-ink/30"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">
            Chaos intensity · {intensity}
          </span>
          <input
            type="range"
            min={1}
            max={5}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
            className="mt-4 w-full accent-[var(--amber)]"
          />
          <p className="mt-1 text-sm text-ink-soft">1 = canary breeze · 5 = month-end + attackers</p>
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button type="submit" disabled={busy} className="btn-island disabled:opacity-60">
        {busy ? "Spinning the town…" : "Run rehearsal"}
        <span className="orb">{busy ? "…" : "▶"}</span>
      </button>
    </form>
  );
}
