import { NextResponse } from "next/server";
import { aiRewrite } from "@/lib/ai";

export async function POST(req: Request) {
  const { noteId } = await req.json();
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });
  const result = await aiRewrite(noteId);
  return NextResponse.json(result);
}
