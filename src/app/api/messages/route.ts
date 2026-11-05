// src/app/api/messages/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { db, safeDb } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const isId = (s: string) => /^[a-zA-Z0-9-]{8,64}$/.test(s);

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
  if (!isId(sessionId)) return NextResponse.json([]);

  const records = await safeDb(
    () =>
      db.message.findMany({
        where: { sessionId },
        orderBy: { timestamp: "asc" },
        take: 200,
        select: { role: true, content: true },
      }),
    [] as { role: string; content: string }[]
  );
  return NextResponse.json(records);
}

export async function DELETE(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId") ?? "";
  if (!isId(sessionId)) return NextResponse.json({ ok: false }, { status: 400 });
  await safeDb(() => db.message.deleteMany({ where: { sessionId } }), null);
  return NextResponse.json({ ok: true });
}
