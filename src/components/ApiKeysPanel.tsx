"use client";

import { useEffect, useState } from "react";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
};

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("coding-agent");
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/keys");
    const data = await res.json();
    setKeys(data.keys ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    setFresh(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.key) setFresh(data.key);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1">
          <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">Key name</span>
          <input
            className="font-display mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-white/70 px-4 py-3 outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="button" className="btn-island" disabled={busy} onClick={create}>
          Mint agent key
          <span className="orb">＋</span>
        </button>
      </div>

      {fresh && (
        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--amber)_40%,transparent)] bg-[color-mix(in_oklab,var(--amber)_10%,white)] p-4">
          <p className="font-display text-xs uppercase tracking-wider text-ink-soft">
            Copy now — shown once
          </p>
          <code className="font-mono mt-2 block break-all text-sm text-ink">{fresh}</code>
        </div>
      )}

      <ul className="space-y-3">
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] pb-3"
          >
            <div>
              <p className="font-display font-medium">
                {k.name}{" "}
                <span className="font-mono text-xs text-ink-soft">
                  {k.prefix}…{k.revoked ? " (revoked)" : ""}
                </span>
              </p>
              <p className="text-xs text-ink-soft">
                created {new Date(k.createdAt).toLocaleString()}
                {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleString()}` : ""}
              </p>
            </div>
            {!k.revoked && (
              <button
                type="button"
                className="font-display text-sm text-danger"
                onClick={() => revoke(k.id)}
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
