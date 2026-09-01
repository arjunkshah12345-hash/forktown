import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/db/keys";
import { ingestGithubRepo } from "@/lib/github/ingest";
import { townFromFingerprint } from "@/lib/github/fromRepo";
import { createTownFromGithub, listTowns } from "@/lib/sim/store";

export const runtime = "nodejs";

async function auth(req: Request) {
  const key = await authenticateApiKey(req.headers.get("authorization"));
  if (!key) return null;
  return key;
}

export async function GET(req: Request) {
  if (!(await auth(req))) {
    return NextResponse.json({ error: "Unauthorized. Use Authorization: Bearer ft_live_…" }, { status: 401 });
  }
  const towns = await listTowns();
  return NextResponse.json({
    towns: towns.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      codebase: t.codebase,
      customers: t.world.customers,
      tags: t.tags,
    })),
  });
}

const Create = z.object({
  repoUrl: z.string().min(5),
  name: z.string().min(2).max(80).optional(),
});

export async function POST(req: Request) {
  if (!(await auth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = Create.safeParse(await req.json());
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
      town: {
        id: saved.id,
        name: saved.name,
        slug: saved.slug,
        codebase: saved.codebase,
        customers: saved.world.customers,
      },
      fingerprint: {
        fullName: fingerprint.fullName,
        suggestedMigrations: fingerprint.suggestedMigrations,
        hasBilling: fingerprint.hasBilling,
        hasAuth: fingerprint.hasAuth,
        hasMigrations: fingerprint.hasMigrations,
        filesSampled: fingerprint.filesSampled,
      },
    },
    { status: 201 },
  );
}
