import { SiteNav } from "@/components/SiteNav";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

export default function SettingsKeysPage() {
  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-2xl flex-1 px-5 pb-28 pt-28 sm:px-8">
        <p className="eyebrow">Agent access</p>
        <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3rem)] font-semibold tracking-tight">
          API keys
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Coding agents authenticate to <code className="font-mono text-sm">/api/v1/*</code> with{" "}
          <code className="font-mono text-sm">Authorization: Bearer ft_live_…</code>
        </p>
        <div className="mt-10 shell">
          <div className="shell-inner p-6 sm:p-8">
            <ApiKeysPanel />
          </div>
        </div>
        <pre className="mt-8 overflow-x-auto rounded-2xl border border-[var(--hairline)] bg-ink/[0.04] p-4 font-mono text-[12px] leading-relaxed text-ink">
{`curl -X POST http://localhost:3000/api/v1/towns \\
  -H "Authorization: Bearer ft_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"repoUrl":"https://github.com/org/repo"}'

curl -X POST http://localhost:3000/api/v1/towns/TOWN_ID/rehearse \\
  -H "Authorization: Bearer ft_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"kind":"billing","title":"Checkout→invoices","hypothesis":"…","intensity":3}'`}
        </pre>
      </main>
    </>
  );
}
