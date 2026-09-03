import { SiteNav } from "@/components/SiteNav";
import { ApiKeysPanel } from "@/components/ApiKeysPanel";

export default function SettingsKeysPage() {
  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-2xl flex-1 px-4 pb-20 pt-6 sm:px-8">
        <div className="px-panel p-5 sm:p-8">
          <p className="eyebrow">Agent access</p>
          <h1 className="px-title mt-4 !text-[clamp(0.7rem,2.2vw,0.95rem)]">API KEYS</h1>
          <p className="px-body mt-3 px-muted">
            Coding agents authenticate to <code className="font-pixel text-[0.45rem] text-[var(--amber)]">/api/v1/*</code>{" "}
            with <code className="font-pixel text-[0.45rem] text-[var(--amber)]">Authorization: Bearer ft_live_…</code>
          </p>
        </div>
        <div className="mt-4 shell">
          <div className="shell-inner p-5 sm:p-8">
            <ApiKeysPanel />
          </div>
        </div>
        <pre className="mt-4 overflow-x-auto px-panel p-4 font-pixel text-[0.42rem] leading-relaxed text-[#d7ccc8]">
{`curl -X POST https://arjunshah.xyz/forktown/api/v1/towns \\
  -H "Authorization: Bearer ft_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"repoUrl":"https://github.com/org/repo"}'

curl -X POST https://arjunshah.xyz/forktown/api/v1/towns/TOWN_ID/rehearse \\
  -H "Authorization: Bearer ft_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"kind":"billing","title":"Checkout→invoices","hypothesis":"…","intensity":3}'`}
        </pre>
      </main>
    </>
  );
}
