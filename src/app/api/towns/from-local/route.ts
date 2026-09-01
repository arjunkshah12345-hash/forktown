import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestLocalRepo } from "@/lib/github/scanLocal";
import { townFromFingerprint } from "@/lib/github/fromRepo";
import { createTownFromLocal } from "@/lib/sim/store";

export const runtime = "nodejs";

const Schema = z.object({
  localPath: z.string().min(1).max(500),
  name: z.string().min(2).max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { fingerprint, absolutePath } = ingestLocalRepo(parsed.data.localPath);
    const town = townFromFingerprint(fingerprint, { name: parsed.data.name });
    town.codebase = absolutePath;
    const saved = await createTownFromLocal({ town, fingerprint });
    return NextResponse.json({ town: saved, fingerprint, absolutePath }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Local ingest failed" },
      { status: 400 },
    );
  }
}
