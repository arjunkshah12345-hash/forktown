import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto flex max-w-xl flex-1 flex-col justify-center px-4 py-20 sm:px-8">
        <div className="px-dialogue">
          <p className="eyebrow">Off the map</p>
          <h1 className="px-title mt-4 !text-[0.85rem]">TOWN NOT FOUND</h1>
          <p className="px-body mt-3 px-muted">That district isn’t in the registry.</p>
          <Link href="/towns" className="btn-island mt-8 w-fit">
            Back to towns
            <span className="orb">↗</span>
          </Link>
        </div>
      </main>
    </>
  );
}
