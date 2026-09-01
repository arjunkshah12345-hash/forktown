import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/db/keys";
import { createPlan, getTown, runRehearsal } from "@/lib/sim/store";

export const runtime = "nodejs";

const Schema = z.object({
  kind: z.enum(["billing", "auth", "database", "framework", "api_version"]),
  title: z.string().min(4).max(160),
  hypothesis: z.string().min(8).max(500),
  agentName: z.string().min(2).max(80).default("agent"),
  intensity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const key = await authenticateApiKey(req.headers.get("authorization"));
  if (!key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const town = await getTown(id);
  if (!town) return NextResponse.json({ error: "Town not found" }, { status: 404 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const plan = await createPlan({
    townId: town.id,
    ...parsed.data,
    agentName: parsed.data.agentName,
  });
  const run = await runRehearsal(plan.id);

  return NextResponse.json(
    {
      plan: { id: plan.id, title: plan.title, kind: plan.kind },
      run: {
        id: run.id,
        status: run.status,
        ticks: run.ticks,
        survivability: run.report?.overall,
        verdict: run.report?.verdict,
        recommendation: run.report?.recommendation,
        subjective: run.report?.subjective,
        cascadingFailures: run.report?.cascadingFailures,
        url: `/runs/${run.id}`,
      },
    },
    { status: 201 },
  );
}
