import { NextResponse } from "next/server";
import { runReportMarkdown } from "@/lib/export/report";
import { getPlan, getRun, getTown } from "@/lib/sim/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const run = await getRun(id);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const town = await getTown(run.townId);
  if (!town) return NextResponse.json({ error: "Town not found" }, { status: 404 });
  const plan = await getPlan(run.planId);

  const md = runReportMarkdown({
    town,
    plan,
    run,
    fingerprint: town.fingerprint,
  });

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="forktown-${run.id}.md"`,
    },
  });
}
