"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateTownForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [codebase, setCodebase] = useState("");
  const [customers, setCustomers] = useState(25000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/towns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, codebase, customerCount: customers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Could not create town");
      router.push(`/towns/${data.town.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Town name</span>
        <input
          required
          placeholder="Northwind Payments"
          className="font-display mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-white/70 px-4 py-3 outline-none focus:border-ink/30"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Codebase</span>
        <input
          required
          placeholder="github.com/acme/payments"
          className="font-mono mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-ink/30"
          value={codebase}
          onChange={(e) => setCodebase(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">
          Synthetic customers · {customers.toLocaleString()}
        </span>
        <input
          type="range"
          min={5000}
          max={100000}
          step={1000}
          value={customers}
          onChange={(e) => setCustomers(Number(e.target.value))}
          className="mt-4 w-full accent-[var(--amber)]"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-island">
        {busy ? "Generating world…" : "Found a town"}
        <span className="orb">＋</span>
      </button>
    </form>
  );
}
