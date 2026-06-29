"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isNoteType, parseTags } from "@/lib/types";
import { analyzeAndConnect } from "@/lib/ai";

function normalizeTags(raw: string): string {
  return parseTags(raw).join(",");
}

export async function createNote(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "notitie");
  const category = String(formData.get("category") ?? "").trim();
  const tags = normalizeTags(String(formData.get("tags") ?? ""));

  if (!title && !content) return;

  const note = await prisma.note.create({
    data: {
      title: title || "(zonder titel)",
      content,
      type: isNoteType(typeRaw) ? typeRaw : "notitie",
      category: category || null,
      tags,
    },
  });

  // AI-analyse op de achtergrond — niet awaiten zodat de UI snel reageert
  analyzeAndConnect(note.id).catch(console.error);

  revalidatePath("/");
}

export async function updateNote(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "notitie");
  const category = String(formData.get("category") ?? "").trim();
  const tags = normalizeTags(String(formData.get("tags") ?? ""));

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
