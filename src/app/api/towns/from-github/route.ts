import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestGithubRepo } from "@/lib/github/ingest";
import { townFromFingerprint } from "@/lib/github/fromRepo";
import { createTownFromGithub } from "@/lib/sim/store";

export const runtime = "nodejs";

const Schema = z.object({
  repoUrl: z.string().min(5).max(300),
  name: z.string().min(2).max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { fingerprint } = await ingestGithubRepo(parsed.data.repoUrl);
    const town = townFromFingerprint(fingerprint, { name: parsed.data.name });
    const saved = await createTownFromGithub({
      town,
      fingerprint,
      repoUrl: `https://github.com/${fingerprint.fullName}`,
    });
    return NextResponse.json(
      {
        town: saved,
        fingerprint,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    const status = message.includes("404") ? 404 : message.includes("403") || message.includes("rate") ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
