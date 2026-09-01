import { NextResponse } from "next/server";
import { resyncTown } from "@/lib/sim/store";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const town = await resyncTown(id);
    return NextResponse.json({ town, fingerprint: town.fingerprint });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resync failed" },
      { status: 400 },
    );
  }
}
