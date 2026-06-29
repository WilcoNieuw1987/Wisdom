import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { analyzeAndConnect } from "@/lib/ai";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Vercel roept dit aan via cron — beveiligd met een secret header
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pak notities die oud genoeg zijn om te verbeteren (> 1 dag, niet gearchiveerd)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const notes = await prisma.note.findMany({
    where: {
      archived: false,
      updatedAt: { lt: cutoff },
      content: { not: "" },
    },
    orderBy: { updatedAt: "asc" },
    take: 10, // max 10 per run om kosten te beperken
  });

  if (notes.length === 0) {
    return NextResponse.json({ improved: 0 });
  }

  const improved: string[] = [];

  for (const note of notes) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Verbeter deze werknotitie. Maak de titel scherper en de inhoud concreter, maar behoud de originele betekenis. Voeg geen informatie toe die er niet in zit.

Type: ${note.type}
Titel: ${note.title}
Inhoud: ${note.content}

Geef alleen geldig JSON terug:
{"title": "verbeterde titel", "content": "verbeterde inhoud"}`,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      if (!json) continue;

      const parsed = JSON.parse(json);
      if (!parsed.title || !parsed.content) continue;

      // Alleen opslaan als er echt iets veranderd is
      if (parsed.title === note.title && parsed.content === note.content)
        continue;

      await prisma.note.update({
        where: { id: note.id },
        data: { title: parsed.title, content: parsed.content },
      });

      analyzeAndConnect(note.id).catch(console.error);
      improved.push(note.id);
    } catch (e) {
      console.error("Improve error for note", note.id, e);
    }
  }

  return NextResponse.json({ improved: improved.length, ids: improved });
}
