import { NextResponse } from "next/server";
import { aiLearningInsight } from "@/lib/ai";

export async function POST(req: Request) {
  const { learningId } = await req.json();
  if (!learningId) return NextResponse.json({ error: "learningId required" }, { status: 400 });
  const insight = await aiLearningInsight(learningId);
  return NextResponse.json({ insight });
}
