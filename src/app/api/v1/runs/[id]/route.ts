import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/db/keys";
import { getRun, getTown } from "@/lib/sim/store";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const key = await authenticateApiKey(req.headers.get("authorization"));
  if (!key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const run = await getRun(id);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const town = await getTown(run.townId);
  return NextResponse.json({
    run: {
      id: run.id,
      status: run.status,
      ticks: run.ticks,
      report: run.report,
      dialogueCount: run.dialogue?.length ?? 0,
      eventCount: run.events.length,
    },
    town: town
      ? { id: town.id, name: town.name, codebase: town.codebase }
      : null,
  });
}
