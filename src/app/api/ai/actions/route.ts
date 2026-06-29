import { NextResponse } from "next/server";
import { aiExtractActions } from "@/lib/ai";

export async function POST(req: Request) {
  const { noteId } = await req.json();
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });
  const actions = await aiExtractActions(noteId);
  return NextResponse.json({ actions });
}
