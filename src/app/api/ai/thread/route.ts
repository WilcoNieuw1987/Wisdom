import { NextResponse } from "next/server";
import { aiRedThread } from "@/lib/ai";

export async function POST(req: Request) {
  const { noteId } = await req.json();
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });
  const thread = await aiRedThread(noteId);
  return NextResponse.json({ thread });
}
