"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MigrationPlaybook } from "@/lib/github/playbook";

export function QuickRehearse({
  townId,
  playbook,
}: {
  townId: string;
  playbook?: MigrationPlaybook | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const pb = playbook ?? {
    kind: "billing" as const,
    title: "Stripe Checkout → custom invoices",
    hypothesis:
      "Dual-write + cohort flags + legacy bug opt-in will keep loss-averse buyers below churn threshold.",
    intensity: 3 as const,
    rationale: "Default billing rehearsal.",
  };

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/towns/${townId}/rehearse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: pb.kind,
          title: pb.title,
          hypothesis: pb.hypothesis,
          agentName: "Forge",
          intensity: pb.intensity,
          runNow: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Rehearsal failed");
      router.push(`/runs/${data.run.id}`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={run} disabled={busy} className="btn-island disabled:opacity-60">
      {busy ? "Town waking up…" : `One-click ${pb.kind} rehearsal`}
      <span className="orb">{busy ? "…" : "▶"}</span>
    </button>
  );
}
