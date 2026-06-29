import { NextResponse } from "next/server";
import { aiInsight } from "@/lib/ai";

export async function POST(req: Request) {
  const { noteId } = await req.json();
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });
  const insight = await aiInsight(noteId);
  return NextResponse.json({ insight });
}
