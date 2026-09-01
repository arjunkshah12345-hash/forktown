import { NextResponse } from "next/server";
import { createTown, listTowns } from "@/lib/sim/store";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const towns = await listTowns();
  return NextResponse.json({ towns });
}

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
  codebase: z.string().min(2).max(200),
  customerCount: z.number().int().min(1000).max(200000).optional(),
  seed: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const town = await createTown(parsed.data);
  return NextResponse.json({ town }, { status: 201 });
}
