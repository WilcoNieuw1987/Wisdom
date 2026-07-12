"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isNoteType } from "@/lib/types";
import { analyzeAndConnect, autoFill, clusterLearning } from "@/lib/ai";
import { normalizeImportItem, extractImportItems, tagsToString } from "@/lib/learnings";

export async function createNote(formData: FormData) {
  const raw = String(formData.get("raw") ?? "").trim();
  if (!raw) return;

  // Sla direct op met ruwe tekst zodat de UI niet wacht op AI
  const note = await prisma.note.create({
    data: { title: raw.slice(0, 80), content: raw, type: "notitie" },
  });

  // AI verwerkt op de achtergrond: titel, type, tags, verbindingen
  autoFill(raw)
    .then(async (filled) => {
      await prisma.note.update({
        where: { id: note.id },
        data: { title: filled.title, type: filled.type, tags: filled.tags, content: filled.content },
      });
      return analyzeAndConnect(note.id);
    })
    .catch(console.error);

  revalidatePath("/");
}

export async function updateNote(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "notitie");
  const category = String(formData.get("category") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim();

  await prisma.note.update({
    where: { id },
    data: {
      title: title || "(zonder titel)",
      content,
      type: isNoteType(typeRaw) ? typeRaw : "notitie",
      category: category || null,
      tags,
    },
  });

  analyzeAndConnect(id).catch(console.error);

  revalidatePath("/");
}

export async function deleteNote(id: string) {
  await prisma.note.delete({ where: { id } });
  revalidatePath("/");
}

export async function togglePin(id: string, pinned: boolean) {
  await prisma.note.update({ where: { id }, data: { pinned } });
  revalidatePath("/");
}

export async function toggleArchive(id: string, archived: boolean) {
  await prisma.note.update({ where: { id }, data: { archived } });
  revalidatePath("/");
}

export async function enrichNote(
  id: string,
  enrichedTitle: string,
  enrichedContent: string
) {
  await prisma.note.update({
    where: { id },
    data: { title: enrichedTitle, content: enrichedContent },
  });
  analyzeAndConnect(id).catch(console.error);
  revalidatePath("/");
}

export async function savePartialInterview(
  id: string,
  qa: { question: string; answer: string }[]
) {
  if (!qa.length) return;
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) return;

  const addendum = qa
    .map(({ question, answer }) => `V: ${question}\nA: ${answer}`)
    .join("\n\n");
  const newContent = note.content
    ? `${note.content}\n\n---\n${addendum}`
    : addendum;

  await prisma.note.update({ where: { id }, data: { content: newContent } });
  revalidatePath("/");
}

// ─── Learnings ──────────────────────────────────────────────────────────────

export async function createLearning(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const dateRaw = String(formData.get("date") ?? "").trim();
  const parsedDate = dateRaw ? new Date(dateRaw) : new Date();

  const learning = await prisma.learning.create({
    data: {
      title,
      insight: String(formData.get("insight") ?? "").trim(),
      evidence: String(formData.get("evidence") ?? "").trim() || null,
      action: String(formData.get("action") ?? "").trim() || null,
      category: String(formData.get("category") ?? "Algemeen").trim() || "Algemeen",
      tags: tagsToString(String(formData.get("tags") ?? "")),
      source: String(formData.get("source") ?? "").trim() || null,
      date: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
    },
  });

  clusterLearning(learning.id).catch(console.error);
  revalidatePath("/learnings");
}

export async function updateLearning(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const parsedDate = dateRaw ? new Date(dateRaw) : null;

  await prisma.learning.update({
    where: { id },
    data: {
      title: title || "(zonder titel)",
      insight: String(formData.get("insight") ?? "").trim(),
      evidence: String(formData.get("evidence") ?? "").trim() || null,
      action: String(formData.get("action") ?? "").trim() || null,
      category: String(formData.get("category") ?? "Algemeen").trim() || "Algemeen",
      tags: tagsToString(String(formData.get("tags") ?? "")),
      source: String(formData.get("source") ?? "").trim() || null,
      ...(parsedDate && !Number.isNaN(parsedDate.getTime()) ? { date: parsedDate } : {}),
    },
  });

  clusterLearning(id).catch(console.error);
  revalidatePath("/learnings");
}

export async function deleteLearning(id: string) {
  await prisma.learning.delete({ where: { id } });
  revalidatePath("/learnings");
}

// Importeer een JSON-array van learnings in één keer.
// Retourneert het aantal geïmporteerde items of een foutmelding.
export async function importLearnings(
  json: string
): Promise<{ imported: number } | { error: string }> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { error: "Ongeldige JSON." };
  }

  const extracted = extractImportItems(data);
  if (!extracted) {
    return { error: "JSON moet een array van learnings zijn, of een object met een 'learnings'-array." };
  }

  const rows = extracted.items
    .map((item) => normalizeImportItem(item, extracted.defaults))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return { error: "Geen geldige learnings gevonden (elke learning heeft minimaal een 'title')." };
  }

  const created = await prisma.learning.createManyAndReturn({ data: rows });

  // Cluster op de achtergrond, niet blokkerend
  Promise.allSettled(created.map((l) => clusterLearning(l.id))).catch(console.error);

  revalidatePath("/learnings");
  return { imported: created.length };
}
