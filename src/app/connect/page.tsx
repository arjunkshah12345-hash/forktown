import { SiteNav } from "@/components/SiteNav";
import { ConnectRepoForm } from "@/components/ConnectRepoForm";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; path?: string }>;
}) {
  const sp = await searchParams;
  const defaultLocalPath = sp.path ? decodeURIComponent(sp.path) : undefined;

  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-2xl flex-1 px-4 pb-20 pt-6 sm:px-8">
        <div className="px-panel p-5 sm:p-8">
          <p className="eyebrow">
            <span className="beacon" />
            Plant a seed
          </p>
          <h1 className="px-title mt-4 !text-[clamp(0.7rem,2.2vw,0.95rem)]">CONNECT A CODEBASE</h1>
          <p className="px-body mt-3 px-muted">
            Forktown fingerprints billing/auth/migration surfaces from GitHub or a local checkout,
            then founds a town sized to the real repo — not a canned demo world.
          </p>
        </div>
        <div className="mt-4 shell">
          <div className="shell-inner p-5 sm:p-8">
            <ConnectRepoForm defaultLocalPath={defaultLocalPath} />
          </div>
        </div>
      </main>
    </>
  );
}
