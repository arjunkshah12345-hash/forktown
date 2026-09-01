import { NextResponse } from "next/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/db/keys";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // UI can list without key on localhost; v1 agents use POST with auth for minting only via UI for now
  const keys = await listApiKeys();
  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      revoked: Boolean(k.revokedAt),
    })),
  });
}

const Create = z.object({ name: z.string().min(2).max(80) });

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Create.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const created = await createApiKey(parsed.data.name);
  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      prefix: created.prefix,
      key: created.key,
      createdAt: created.createdAt,
      warning: "Copy this key now. It will not be shown again.",
    },
    { status: 201 },
  );
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await revokeApiKey(id);
  return NextResponse.json({ ok: true });
}

/** Kept for route module clarity; v1 routes import authenticateApiKey directly. */
export {};

