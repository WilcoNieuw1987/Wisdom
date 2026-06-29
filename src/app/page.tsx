import { prisma } from "@/lib/prisma";
import { NOTE_TYPES, isNoteType } from "@/lib/types";
import { NoteForm } from "@/components/NoteForm";
import { NoteCard } from "@/components/NoteCard";
import { Filters } from "@/components/Filters";
import { LogoutButton } from "@/components/LogoutButton";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  type?: string;
  view?: string; // "actief" (default) | "archief"
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const type = sp.type && isNoteType(sp.type) ? sp.type : undefined;
  const showArchived = sp.view === "archief";

  const where: Prisma.NoteWhereInput = {
    archived: showArchived,
    ...(type ? { type } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
            { tags: { contains: q } },
            { category: { contains: q } },
          ],
        }
      : {}),
  };

  const notes = await prisma.note.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  const counts = await prisma.note.groupBy({
    by: ["type"],
    where: { archived: false },
    _count: true,
  });
  const countByType = Object.fromEntries(
    counts.map((c) => [c.type, c._count]),
  ) as Record<string, number>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wisdom</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Je werkboekje — ideeën, frustraties en notities, geordend.
          </p>
        </div>
        <LogoutButton />
      </header>

      <NoteForm types={[...NOTE_TYPES]} />

      <Filters
        activeType={type}
        q={q}
        showArchived={showArchived}
        countByType={countByType}
      />

      <section className="mt-6 space-y-3">
        {notes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
            {showArchived
              ? "Geen gearchiveerde aantekeningen."
              : q || type
                ? "Niets gevonden met deze filters."
                : "Nog geen aantekeningen. Schrijf je eerste hierboven."}
          </p>
        ) : (
          notes.map((note) => (
            <NoteCard key={note.id} note={note} types={[...NOTE_TYPES]} />
          ))
        )}
      </section>
    </main>
  );
}
