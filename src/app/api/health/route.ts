import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listRecentRuns, listTowns } from "@/lib/sim/store";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  try {
    const towns = await listTowns();
    const recent = await listRecentRuns(12);
    const survived = recent.filter((r) => r.run.status === "survived").length;
    return NextResponse.json({
      ok: true,
      db: "sqlite",
      towns: towns.length,
      recentRuns: recent.length,
      survivedRate: recent.length ? survived / recent.length : null,
      recent: recent.map((r) => ({
        runId: r.run.id,
        townName: r.townName,
        status: r.run.status,
        survivability: r.run.report?.overall,
        startedAt: r.run.startedAt,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unhealthy" },
      { status: 503 },
    );
  }
}
