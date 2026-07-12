"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseTags, type Learning } from "@/lib/learnings";
import { LearningCard } from "./LearningCard";
import { LearningForm } from "./LearningForm";
import { LearningImport } from "./LearningImport";
import { LogoutButton } from "./LogoutButton";

type Panel = "none" | "add" | "import";

export function LearningsView({ learnings }: { learnings: Learning[] }) {
  const [panel, setPanel] = useState<Panel>("none");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  // Beschikbare categorieën + tags uit de data
  const categories = useMemo(
    () => [...new Set(learnings.map((l) => l.category))].sort(),
    [learnings]
  );
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of learnings) for (const t of parseTags(l.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [learnings]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return learnings.filter((l) => {
      if (category && l.category !== category) return false;
      if (tag && !parseTags(l.tags).includes(tag)) return false;
      if (needle) {
        const hay = `${l.title} ${l.insight} ${l.evidence ?? ""} ${l.action ?? ""} ${l.tags} ${l.category} ${l.source ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [learnings, q, category, tag]);

  // Groepeer op categorie
  const grouped = useMemo(() => {
    const map = new Map<string, Learning[]>();
    for (const l of filtered) {
      if (!map.has(l.category)) map.set(l.category, []);
      map.get(l.category)!.push(l);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">🏃 Learnings</h1>
            <p className="text-xs text-neutral-600 mt-0.5">gestructureerde inzichten, geordend door AI</p>
          </div>
          <LogoutButton />
        </div>

        <nav className="mt-5 inline-flex rounded-xl border border-neutral-800 bg-neutral-900 p-1 text-xs">
          <Link href="/" className="rounded-lg px-3 py-1.5 text-neutral-400 hover:text-white transition">📝 Lijst</Link>
          <Link href="/swipe" className="rounded-lg px-3 py-1.5 text-neutral-400 hover:text-white transition">📱 Swipe</Link>
          <Link href="/graph" className="rounded-lg px-3 py-1.5 text-neutral-400 hover:text-white transition">🕸 Graph</Link>
          <span className="rounded-lg bg-white px-3 py-1.5 font-semibold text-black">🏃 Learnings</span>
        </nav>
      </header>

      {/* Acties */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPanel(panel === "add" ? "none" : "add")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${panel === "add" ? "bg-neutral-700 text-white" : "bg-white text-black hover:bg-neutral-200"}`}
        >
          + Nieuwe learning
        </button>
        <button
          onClick={() => setPanel(panel === "import" ? "none" : "import")}
          className={`rounded-xl border border-neutral-800 px-4 py-2 text-sm transition ${panel === "import" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:border-neutral-600"}`}
        >
          ⇪ Importeer JSON
        </button>
      </div>

      {panel === "add" && <div className="mb-6"><LearningForm onDone={() => setPanel("none")} /></div>}
      {panel === "import" && <div className="mb-6"><LearningImport onDone={() => setPanel("none")} /></div>}

      {/* Zoek + filters */}
      <div className="space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoeken in learnings…"
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-neutral-600 transition"
        />

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button onClick={() => setCategory(null)} className={`rounded-full px-3 py-1 transition ${!category ? "bg-white text-black font-semibold" : "text-neutral-500 hover:text-white"}`}>
            Alle categorieën
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(category === c ? null : c)} className={`rounded-full px-3 py-1 transition ${category === c ? "bg-white text-black font-semibold" : "text-neutral-500 hover:text-white"}`}>
              {c}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {tag && (
              <button onClick={() => setTag(null)} className="rounded-full bg-neutral-700 px-3 py-1 text-white">#{tag} ×</button>
            )}
            {allTags.filter((t) => t !== tag).slice(0, 14).map((t) => (
              <button key={t} onClick={() => setTag(t)} className="rounded-full px-2.5 py-1 text-neutral-500 hover:text-white transition">#{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* Resultaten, gegroepeerd op categorie */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-800 px-4 py-12 text-center text-sm text-neutral-600">
            {learnings.length === 0
              ? "Nog geen learnings. Voeg er een toe of importeer je JSON."
              : "Niets gevonden met deze filters."}
          </p>
        ) : (
          <div className="space-y-8">
            {grouped.map(([cat, items]) => (
              <section key={cat}>
                <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  {cat} <span className="text-neutral-700">· {items.length}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((l) => (
                    <LearningCard key={l.id} learning={l} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
