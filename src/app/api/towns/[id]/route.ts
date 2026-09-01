import { NextResponse } from "next/server";
import { getTown, listPlans, listRuns } from "@/lib/sim/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const town = await getTown(id);
  if (!town) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const plans = await listPlans(town.id);
  const runs = await listRuns(town.id);
  return NextResponse.json({ town, plans, runs });
}
