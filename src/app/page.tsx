import { prisma } from "@/lib/prisma";
import { NOTE_TYPES, isNoteType } from "@/lib/types";
import { NoteForm } from "@/components/NoteForm";
import { NoteCard } from "@/components/NoteCard";
import { Filters } from "@/components/Filters";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; type?: string; view?: string };

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
            { cluster: { contains: q } },
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
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Wisdom</h1>
          <p className="text-xs text-neutral-600 mt-0.5">je tweede brein, geordend door AI</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/graph"
            className="rounded-xl border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 hover:border-neutral-600 hover:text-white transition"
          >
            🕸 Graph
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Input */}
      <NoteForm />

      {/* Filters */}
      <Filters
        activeType={type}
        q={q}
        showArchived={showArchived}
        countByType={countByType}
      />

      {/* Notes */}
      <section className="mt-5 space-y-3">
        {notes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-800 px-4 py-12 text-center text-sm text-neutral-600">
            {showArchived
              ? "Geen gearchiveerde aantekeningen."
              : q || type
                ? "Niets gevonden."
                : "Typ hierboven wat er in je hoofd zit. AI doet de rest."}
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
