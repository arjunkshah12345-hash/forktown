import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { LiveRunConsole } from "@/components/LiveRunConsole";
import { ExportReportButton } from "@/components/ExportReportButton";
import { WarRoom } from "@/components/WarRoom";
import { SurvivalReport } from "@/components/SurvivalReport";
import { getPlan, getRun, getTown } from "@/lib/sim/store";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();
  const town = await getTown(run.townId);
  if (!town) notFound();
  const plan = await getPlan(run.planId);

  return (
    <>
      <SiteNav />
      <main className="relative z-[2] mx-auto max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-8">
        <Link
          href={`/towns/${town.slug === "acme-billing-town" ? town.slug : town.id}`}
          className="font-pixel text-[0.42rem] text-[#bcaaa4] hover:text-[var(--amber)]"
        >
          ← {town.name}
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 px-panel p-5">
          <div>
            <p className="eyebrow">
              <span className="beacon" />
              War room
            </p>
            <h1 className="px-title mt-3 !text-[clamp(0.65rem,2vw,0.95rem)]">
              {plan?.title ?? "Migration rehearsal"}
            </h1>
            <p className="px-body mt-2 px-muted">
              Agent {plan?.agentName ?? "—"} · intensity {plan?.intensity ?? "—"} ·{" "}
              <span className="capitalize">{run.status}</span>
              {run.dialogue ? ` · ${run.dialogue.length} negotiation turns` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ExportReportButton runId={run.id} />
            <Link href={`/towns/${town.id}`} className="btn-ghost">
              Back to town
            </Link>
            <Link href={`/towns/${town.id}/rehearse`} className="btn-island">
              Run again
            </Link>
          </div>
        </div>

        <div className="mt-4">
          <WarRoom run={run} districts={town.districts} />
        </div>

        <div className="mt-6">
          <SurvivalReport run={run} />
        </div>

        <details className="mt-6 px-panel p-4">
          <summary className="font-pixel cursor-pointer text-[0.45rem] text-[#bcaaa4] hover:text-[var(--amber)]">
            Raw chronograph log
          </summary>
          <div className="mt-4">
            <LiveRunConsole run={run} paceMs={280} />
          </div>
        </details>
      </main>
    </>
  );
}
