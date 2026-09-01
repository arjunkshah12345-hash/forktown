import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { RehearseForm } from "@/components/RehearseForm";
import { allPlaybooks, primaryPlaybook } from "@/lib/github/playbook";
import { getTown } from "@/lib/sim/store";

export const dynamic = "force-dynamic";

export default async function RehearsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const town = await getTown(id);
  if (!town) notFound();
  const playbooks = town.fingerprint ? allPlaybooks(town.fingerprint) : [];
  const primary = primaryPlaybook(town.fingerprint);

  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-3xl flex-1 px-5 pb-28 pt-28 sm:px-8">
        <Link href={`/towns/${town.slug === "acme-billing-town" ? town.slug : town.id}`} className="font-display text-sm text-ink-soft hover:text-ink">
          ← {town.name}
        </Link>
        <p className="eyebrow mt-8">Agent-safe migration</p>
        <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3rem)] font-semibold tracking-tight">
          Rehearse in {town.name}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          The agent ships a change. Eight pressure layers attack. Survivability decides if you trust the PR.
        </p>
        <div className="mt-12 shell">
          <div className="shell-inner p-6 sm:p-8">
            <RehearseForm townId={town.id} playbooks={playbooks} defaultKind={primary.kind} />
          </div>
        </div>
      </main>
    </>
  );
}
