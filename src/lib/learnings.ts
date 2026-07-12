// Types en helpers voor gestructureerde learnings

export const LEARNING_CATEGORIES = [
  "Hardlopen",
  "Werk",
  "Gezondheid",
  "Mindset",
  "Voeding",
  "Algemeen",
] as const;

export type LearningCategory = (typeof LEARNING_CATEGORIES)[number];

// Vorm zoals opgeslagen in de DB (tags als comma-string, net als Note)
export type Learning = {
  id: string;
  title: string;
  insight: string;
  evidence: string | null;
  action: string | null;
  category: string;
  tags: string;
  source: string | null;
  cluster: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
};

// Vorm zoals aangeleverd in een import-JSON (tags als array, meeste velden optioneel)
export type LearningImportItem = {
  title: string;
  insight?: string;
  evidence?: string | null;
  action?: string | null;
  category?: string;
  tags?: string[] | string;
  source?: string | null;
  date?: string;
};

export function parseTags(tags: string): string[] {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function tagsToString(tags: string[] | string | undefined | null): string {
  if (!tags) return "";
  if (Array.isArray(tags)) return tags.map((t) => t.trim()).filter(Boolean).join(", ");
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .join(", ");
}

export function isLearningCategory(value: string): value is LearningCategory {
  return (LEARNING_CATEGORIES as readonly string[]).includes(value);
}

// Kleur per categorie (tailwind accent), val terug op neutraal
export const CATEGORY_COLOR: Record<string, string> = {
  Hardlopen: "emerald",
  Werk: "sky",
  Gezondheid: "rose",
  Mindset: "violet",
  Voeding: "amber",
  Algemeen: "neutral",
};

// Normaliseer één import-item naar DB-velden (zonder id/timestamps)
export function normalizeImportItem(item: LearningImportItem) {
  const title = String(item.title ?? "").trim();
  if (!title) return null;
  const category = item.category?.trim() || "Algemeen";
  let date = new Date();
  if (item.date) {
    const parsed = new Date(item.date);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  return {
    title,
    insight: String(item.insight ?? "").trim(),
    evidence: item.evidence?.toString().trim() || null,
    action: item.action?.toString().trim() || null,
    category,
    tags: tagsToString(item.tags),
    source: item.source?.toString().trim() || null,
    date,
  };
}
