"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isNoteType } from "@/lib/types";
import { analyzeAndConnect, autoFill } from "@/lib/ai";

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
