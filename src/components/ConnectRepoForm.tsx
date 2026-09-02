"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@/lib/paths";

type Mode = "github" | "local";

export function ConnectRepoForm({ defaultLocalPath }: { defaultLocalPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(defaultLocalPath ? "local" : "github");
  const [repoUrl, setRepoUrl] = useState("https://github.com/");
  const [localPath, setLocalPath] = useState(defaultLocalPath ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setPhase(mode === "github" ? "Fetching repository tree from GitHub…" : "Scanning local filesystem…");
    try {
      const endpoint =
        mode === "github"
          ? withBase("/api/towns/from-github")
          : withBase("/api/towns/from-local");
      const body =
        mode === "github"
          ? { repoUrl, name: name || undefined }
          : { localPath, name: name || undefined };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Ingest failed");
      setPhase(
        `Fingerprinted ${data.fingerprint.filesSampled} files · ${data.fingerprint.suggestedMigrations.join(", ")}`,
      );
      router.push(`/towns/${data.town.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
      setPhase(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex gap-2">
        {(
          [
            ["github", "GitHub"],
            ["local", "Local path"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`font-display rounded-full px-4 py-2 text-sm transition ${
              mode === id
                ? "bg-ink text-paper"
                : "border border-[var(--hairline)] bg-white/50 text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "github" ? (
        <label className="block">
          <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">
            GitHub repository
          </span>
          <input
            required
            className="font-mono mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-ink/30"
            placeholder="https://github.com/org/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
        </label>
      ) : (
        <label className="block">
          <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">
            Absolute path on this machine
          </span>
          <input
            required
            className="font-mono mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-white/70 px-4 py-3 text-sm outline-none focus:border-ink/30"
            placeholder="/Users/you/projects/my-app"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
          />
        </label>
      )}

      <label className="block">
        <span className="font-display text-xs uppercase tracking-[0.16em] text-ink-soft">
          Town name (optional)
        </span>
        <input
          className="font-display mt-2 w-full rounded-2xl border border-[var(--hairline)] bg-white/70 px-4 py-3 outline-none focus:border-ink/30"
          placeholder="Derived from repo name if empty"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {phase && <p className="font-mono text-xs text-canal">{phase}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-island disabled:opacity-60">
        {busy ? "Ingesting real repo…" : "Connect & found town"}
        <span className="orb">{busy ? "…" : "↗"}</span>
      </button>
      <p className="text-xs text-ink-soft">
        {mode === "github" ? (
          <>
            Public repos work without a token. For private repos or higher rate limits, set{" "}
            <code className="font-mono">GITHUB_TOKEN</code> in <code className="font-mono">.env.local</code>.
          </>
        ) : (
          <>Local ingest runs on the Forktown server — use the CLI for remote machines.</>
        )}
      </p>
    </form>
  );
}
