import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [notes, connections] = await Promise.all([
    prisma.note.findMany({
      where: { archived: false },
      select: { id: true, title: true, type: true, cluster: true, pinned: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.noteConnection.findMany({
      select: { fromId: true, toId: true, reason: true, strength: true },
    }),
  ]);

  return NextResponse.json({ notes, connections });
}
