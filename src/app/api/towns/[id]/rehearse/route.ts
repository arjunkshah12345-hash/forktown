import { NextResponse } from "next/server";
import { createPlan, getTown, runRehearsal } from "@/lib/sim/store";
import { z } from "zod";

export const runtime = "nodejs";

const Schema = z.object({
  kind: z.enum(["billing", "auth", "database", "framework", "api_version"]),
  title: z.string().min(4).max(160),
  hypothesis: z.string().min(8).max(500),
  agentName: z.string().min(2).max(80).default("Forktown Agent"),
  intensity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  runNow: z.boolean().optional().default(true),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const town = await getTown(id);
  if (!town) return NextResponse.json({ error: "Town not found" }, { status: 404 });
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const plan = await createPlan({
    townId: town.id,
    kind: parsed.data.kind,
    title: parsed.data.title,
    hypothesis: parsed.data.hypothesis,
    agentName: parsed.data.agentName,
    intensity: parsed.data.intensity,
  });
  if (!parsed.data.runNow) {
    return NextResponse.json({ plan }, { status: 201 });
  }
  const run = await runRehearsal(plan.id);
  return NextResponse.json({ plan, run }, { status: 201 });
}
