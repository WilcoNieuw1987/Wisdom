import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export async function autoFill(raw: string): Promise<{
  title: string;
  type: "idee" | "frustratie" | "notitie";
  tags: string;
  content: string;
}> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Verwerk deze werkaantekening. Geef alleen geldig JSON terug (geen markdown):

"${raw}"

{
  "title": "beknopte titel, max 8 woorden",
  "type": "idee" of "frustratie" of "notitie",
  "tags": "komma-gescheiden trefwoorden, max 3",
  "content": "originele tekst, eventueel iets compacter geschreven"
}`,
      },
    ],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "";
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return { title: raw.slice(0, 60), type: "notitie", tags: "", content: raw };
  try {
    const p = JSON.parse(json);
    return {
      title: p.title ?? raw.slice(0, 60),
      type: ["idee", "frustratie", "notitie"].includes(p.type) ? p.type : "notitie",
      tags: p.tags ?? "",
      content: p.content ?? raw,
    };
  } catch {
    return { title: raw.slice(0, 60), type: "notitie", tags: "", content: raw };
  }
}

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

// ─── Extra AI functies ────────────────────────────────────────────────────────

export async function aiExtractActions(noteId: string): Promise<string[]> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return [];
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `Je bent een productiviteitscoach. Extraheer 3-5 concrete, uitvoerbare actiepunten uit deze werkaantekening. Wees specifiek — geen vage adviezen.

Type: ${note.type} | Titel: ${note.title}
Inhoud: ${note.content || note.title}

Geef ALLEEN een JSON array terug: ["Actie 1", "Actie 2", ...]`,
    }],
  });
  const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
  try { return JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]"); } catch { return []; }
}

export async function aiRewrite(noteId: string): Promise<{ title: string; content: string }> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) throw new Error("Niet gevonden");
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `Herschrijf deze werkaantekening. Maak de titel pakkend (max 8 woorden) en de inhoud helderder, gestructureerder en actiegerichter. Behoud de kern.

Type: ${note.type} | Titel: ${note.title}
Inhoud: ${note.content || ""}

Geef ALLEEN JSON terug: {"title": "...", "content": "..."}`,
    }],
  });
  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  try {
    const p = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    return { title: p.title || note.title, content: p.content || note.content };
  } catch { return { title: note.title, content: note.content }; }
}

export async function aiInsight(noteId: string): Promise<string> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return "";
  const connections = await prisma.noteConnection.findMany({
    where: { OR: [{ fromId: noteId }, { toId: noteId }] },
    include: { from: true, to: true },
    take: 3,
  });
  const context = connections
    .map((c) => `- ${(c.fromId === noteId ? c.to : c.from).title}: ${c.reason}`)
    .join("\n");
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Je bent een scherpe denker. Geef één verrassend inzicht, onverwachte hoek, of cruciale vraag bij deze werkaantekening. Max 3 zinnen. Wees specifiek — geen open deuren.

${note.type}: "${note.title}"
${note.content ? note.content.slice(0, 400) : ""}
${context ? `\nVerbonden met:\n${context}` : ""}

Geef ALLEEN de tekst terug, geen inleiding.`,
    }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}

export async function aiRedThread(noteId: string): Promise<string> {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) return "";

  // Verbonden notities via graph
  const connections = await prisma.noteConnection.findMany({
    where: { OR: [{ fromId: noteId }, { toId: noteId }] },
    include: { from: true, to: true },
    orderBy: { strength: "desc" },
    take: 8,
  });
  const connectedByGraph = connections.map((c) =>
    c.fromId === noteId ? c.to : c.from
  );

  // Notities uit hetzelfde cluster
  const clusterNotes = note.cluster
    ? await prisma.note.findMany({
        where: { cluster: note.cluster, archived: false, id: { not: noteId } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      })
    : [];

  // Combineer en dedup
  const all = [...connectedByGraph, ...clusterNotes].filter(
    (n, i, arr) => arr.findIndex((x) => x.id === n.id) === i
  ).slice(0, 10);

  const relatedBlock = all.length
    ? `\nGerelateerde notities:\n${all
        .map((n) => `- [${n.type}] "${n.title}": ${(n.content || "").slice(0, 180)}`)
        .join("\n")}`
    : "";

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 350,
    messages: [
      {
        role: "user",
        content: `Je bent een directe, scherpe coach. Lees onderstaande notities en schrijf één krachtige synthese (3-5 zinnen) die de rode draad blootlegt: wat speelt hier werkelijk? Wat is het onderliggende patroon, de onuitgesproken spanning, of de verborgen kans? Wees specifiek en persoonlijk — geen algemeenheden, geen open deuren. Spring direct in de inhoud.

Centrale notitie [${note.type}]: "${note.title}"
${note.content || ""}${relatedBlock}`,
      },
    ],
  });

  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}

// ─── Learnings ──────────────────────────────────────────────────────────────

// Wijs op de achtergrond een cluster (thema) toe aan een learning
export async function clusterLearning(learningId: string) {
  const learning = await prisma.learning.findUnique({ where: { id: learningId } });
  if (!learning) return;

  const others = await prisma.learning.findMany({
    where: { id: { not: learningId } },
    select: { cluster: true },
    take: 60,
  });
  const existingClusters = [...new Set(others.map((o) => o.cluster).filter(Boolean))];

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 40,
    messages: [
      {
        role: "user",
        content: `Wijs een kort thema (2-3 woorden, Nederlands) toe aan deze learning. ${
          existingClusters.length
            ? `Hergebruik indien passend een bestaand thema: ${existingClusters.join(", ")}.`
            : ""
        }

Categorie: ${learning.category}
Titel: ${learning.title}
Inzicht: ${learning.insight}

Geef ALLEEN het thema terug, niets anders.`,
      },
    ],
  });
  const cluster = msg.content[0].type === "text" ? msg.content[0].text.trim().slice(0, 40) : "";
  if (cluster) {
    await prisma.learning.update({ where: { id: learningId }, data: { cluster } });
  }
}

export async function aiLearningInsight(learningId: string): Promise<string> {
  const learning = await prisma.learning.findUnique({ where: { id: learningId } });
  if (!learning) return "";
  const related = await prisma.learning.findMany({
    where: { id: { not: learningId }, category: learning.category },
    orderBy: { date: "desc" },
    take: 6,
  });
  const context = related
    .map((l) => `- ${l.title}: ${l.insight}`)
    .join("\n");
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Je bent een scherpe coach. Geef één verrassend inzicht of cruciale vraag bij deze learning. Max 3 zinnen, specifiek, geen open deuren.

Categorie ${learning.category} — "${learning.title}"
Inzicht: ${learning.insight}
${learning.evidence ? `Bewijs: ${learning.evidence}` : ""}
${context ? `\nVerwante learnings:\n${context}` : ""}

Geef ALLEEN de tekst terug.`,
      },
    ],
  });
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}

export async function aiLearningThread(learningId: string): Promise<string> {
  const learning = await prisma.learning.findUnique({ where: { id: learningId } });
  if (!learning) return "";
  const related = await prisma.learning.findMany({
    where: {
      id: { not: learningId },
      OR: [{ category: learning.category }, { cluster: learning.cluster ?? "___none___" }],
    },
    orderBy: { date: "desc" },
    take: 10,
  });
  const block = related.length
    ? `\nVerwante learnings:\n${related.map((l) => `- [${l.category}] ${l.title}: ${l.insight}`).join("\n")}`
    : "";
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 350,
    messages: [
      {
        role: "user",
        content: `Je bent een directe coach. Lees deze learnings en schrijf één krachtige synthese (3-5 zinnen): wat is de rode draad, het onderliggende patroon of de verborgen kans? Wees specifiek en persoonlijk.

Centrale learning [${learning.category}]: "${learning.title}"
${learning.insight}${block}`,
      },
    ],
  });
  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}

// ─────────────────────────────────────────────────────────────────────────────

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
