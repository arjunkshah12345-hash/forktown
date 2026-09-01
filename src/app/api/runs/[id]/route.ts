import { NextResponse } from "next/server";
import { getRun, getTown } from "@/lib/sim/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const run = await getRun(id);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const town = await getTown(run.townId);
  return NextResponse.json({ run, town });
}
