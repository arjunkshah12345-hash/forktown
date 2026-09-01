import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto flex max-w-xl flex-1 flex-col justify-center px-5 py-32 sm:px-8">
        <p className="eyebrow">Off the map</p>
        <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight">Town not found</h1>
        <p className="mt-3 text-ink-soft">That district isn’t in the registry.</p>
        <Link href="/towns" className="btn-island mt-8 w-fit">
          Back to towns
          <span className="orb">↗</span>
        </Link>
      </main>
    </>
  );
}
