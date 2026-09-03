import { NextResponse } from "next/server";
import { ensureStarterTown, STARTER_TOWN_SLUG } from "@/lib/sim/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Idempotent seed for the real starter town. */
export async function POST() {
  const town = await ensureStarterTown();
  return NextResponse.json({
    ok: true,
    id: town.id,
    slug: STARTER_TOWN_SLUG,
    name: town.name,
    districts: town.districts.length,
    customers: town.world.customers,
  });
}

export async function GET() {
  return POST();
}
