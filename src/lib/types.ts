export const NOTE_TYPES = ["idee", "frustratie", "notitie"] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export const TYPE_META: Record<
  NoteType,
  { label: string; emoji: string; color: string }
> = {
  idee: { label: "Idee", emoji: "💡", color: "amber" },
  frustratie: { label: "Frustratie", emoji: "😤", color: "rose" },
  notitie: { label: "Notitie", emoji: "📝", color: "sky" },
};

export function isNoteType(value: string): value is NoteType {
  return (NOTE_TYPES as readonly string[]).includes(value);
}

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
