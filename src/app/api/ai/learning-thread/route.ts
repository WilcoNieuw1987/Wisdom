import { NextResponse } from "next/server";
import { aiLearningThread } from "@/lib/ai";

export async function POST(req: Request) {
  const { learningId } = await req.json();
  if (!learningId) return NextResponse.json({ error: "learningId required" }, { status: 400 });
  const thread = await aiLearningThread(learningId);
  return NextResponse.json({ thread });
}
