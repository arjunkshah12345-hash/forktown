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
      <main className="relative z-[2] mx-auto max-w-2xl flex-1 px-5 pb-28 pt-28 sm:px-8">
        <p className="eyebrow">
          <span className="beacon" />
          Real repository
        </p>
        <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3rem)] font-semibold tracking-tight">
          Connect a codebase
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          Forktown fingerprints billing/auth/migration surfaces from GitHub or a local checkout, then
          founds a town sized to the real repo — not a canned demo world.
        </p>
        <div className="mt-10 shell">
          <div className="shell-inner p-6 sm:p-8">
            <ConnectRepoForm defaultLocalPath={defaultLocalPath} />
          </div>
        </div>
      </main>
    </>
  );
}
