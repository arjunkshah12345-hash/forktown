"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResyncButton({ townId }: { townId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function resync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/towns/${townId}/resync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resync failed");
      setMsg(`Resynced · ${data.fingerprint?.filesSampled ?? "?"} files`);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Resync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={resync} disabled={busy} className="btn-ghost text-sm disabled:opacity-60">
        {busy ? "Scanning repo…" : "Resync fingerprint"}
      </button>
      {msg && <p className="font-mono text-[10px] text-canal">{msg}</p>}
    </div>
  );
}
