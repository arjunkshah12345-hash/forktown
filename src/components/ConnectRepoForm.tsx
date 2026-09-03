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
            ["github", "GitHub seed"],
            ["local", "Local path"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`pixel-btn ${mode === id ? "pixel-btn-primary" : "pixel-btn-ghost"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "github" ? (
        <label className="block">
          <span className="font-pixel text-[0.4rem] uppercase text-[#bcaaa4]">GitHub repository</span>
          <input
            required
            className="mt-2 w-full px-3 py-2.5"
            placeholder="https://github.com/org/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
        </label>
      ) : (
        <label className="block">
          <span className="font-pixel text-[0.4rem] uppercase text-[#bcaaa4]">
            Absolute path on this machine
          </span>
          <input
            required
            className="mt-2 w-full px-3 py-2.5"
            placeholder="/Users/you/projects/my-app"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
          />
        </label>
      )}

      <label className="block">
        <span className="font-pixel text-[0.4rem] uppercase text-[#bcaaa4]">Town name (optional)</span>
        <input
          className="mt-2 w-full px-3 py-2.5"
          placeholder="Derived from repo name if empty"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {phase && <p className="font-pixel text-[0.4rem] text-[var(--canal)]">{phase}</p>}
      {error && <p className="font-pixel text-[0.42rem] text-[var(--danger)]">{error}</p>}
      <button type="submit" disabled={busy} className="btn-island disabled:opacity-60">
        {busy ? "Growing town…" : "Plant & found town"}
        <span className="orb">{busy ? "…" : "↗"}</span>
      </button>
      <p className="px-body text-[1rem] px-muted">
        {mode === "github" ? (
          <>
            Public repos work without a token. For private repos, set{" "}
            <code className="font-pixel text-[0.4rem] text-[var(--amber)]">GITHUB_TOKEN</code>.
          </>
        ) : (
          <>Local ingest runs on the Forktown server — use the CLI for remote machines.</>
        )}
      </p>
    </form>
  );
}
