import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type NoteSnapshot = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string;
};

export async function analyzeAndConnect(savedNoteId: string) {
  // Haal alle niet-gearchiveerde notities op
  const allNotes = await prisma.note.findMany({
    where: { archived: false },
    select: { id: true, title: true, content: true, type: true, tags: true },
    orderBy: { createdAt: "desc" },
    take: 60, // houd de prompt behapbaar
  });

  if (allNotes.length < 2) return;

  const savedNote = allNotes.find((n) => n.id === savedNoteId);
  if (!savedNote) return;

  const otherNotes = allNotes.filter((n) => n.id !== savedNoteId);

  const prompt = buildPrompt(savedNote, otherNotes);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  const result = parseResponse(text);

  // Sla cluster op
  if (result.cluster) {
    await prisma.note.update({
      where: { id: savedNoteId },
      data: { cluster: result.cluster },
    });
  }

  // Sla verbindingen op
  for (const conn of result.connections) {
    const targetExists = otherNotes.find((n) => n.id === conn.toId);
    if (!targetExists) continue;

    await prisma.noteConnection.upsert({
      where: { fromId_toId: { fromId: savedNoteId, toId: conn.toId } },
      create: {
        fromId: savedNoteId,
        toId: conn.toId,
        reason: conn.reason,
        strength: conn.strength,
      },
      update: {
        reason: conn.reason,
        strength: conn.strength,
      },
    });
  }
}

function buildPrompt(note: NoteSnapshot, others: NoteSnapshot[]): string {
  const noteText = `ID: ${note.id}
Titel: ${note.title}
Type: ${note.type}
Tags: ${note.tags}
Inhoud: ${note.content}`;

  const othersText = others
    .map(
      (n) =>
        `ID: ${n.id} | Titel: ${n.title} | Type: ${n.type} | Tags: ${n.tags} | Inhoud: ${n.content.slice(0, 120)}`
    )
    .join("\n");

  return `Je bent een persoonlijke kennisassistent. Analyseer de nieuwe aantekening en vergelijk die met de bestaande aantekeningen.

NIEUWE AANTEKENING:
${noteText}

BESTAANDE AANTEKENINGEN:
${othersText}

Geef je antwoord als geldig JSON (geen markdown, geen uitleg, alleen JSON):
{
  "cluster": "korte clusternaam in 2-3 woorden (Nederlands), bijv. 'Klant X', 'Interne processen', 'Team communicatie'",
  "connections": [
    {
      "toId": "id van verwante aantekening",
      "reason": "één zin waarom ze verwant zijn",
      "strength": 0.8
    }
  ]
}

Regels:
- Voeg alleen verbindingen toe met strength >= 0.5 (echt inhoudelijk verwant)
- Maximaal 5 verbindingen
- Als er geen verwante aantekeningen zijn, geef een lege connections array
- De cluster is het overkoepelende thema van deze aantekening`;
}

function parseResponse(text: string): {
  cluster?: string;
  connections: { toId: string; reason: string; strength: number }[];
} {
  try {
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return { connections: [] };
    const parsed = JSON.parse(json);
    return {
      cluster: typeof parsed.cluster === "string" ? parsed.cluster : undefined,
      connections: Array.isArray(parsed.connections)
        ? parsed.connections.filter(
            (c: unknown) =>
              typeof c === "object" &&
              c !== null &&
              "toId" in c &&
              "strength" in c &&
              typeof (c as { strength: unknown }).strength === "number" &&
              (c as { strength: number }).strength >= 0.5
          )
        : [],
    };
  } catch {
    return { connections: [] };
  }
}
