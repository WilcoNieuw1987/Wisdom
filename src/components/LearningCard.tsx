"use client";

import { useState } from "react";
import { deleteLearning } from "@/lib/actions";
import { parseTags, CATEGORY_COLOR, type Learning } from "@/lib/learnings";
import { LearningForm } from "./LearningForm";
import { AiResultModal } from "./AiResultModal";

const ACCENT: Record<string, string> = {
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  rose: "bg-rose-400",
  violet: "bg-violet-400",
  amber: "bg-amber-400",
  neutral: "bg-neutral-500",
};

type AiResult = { mode: "insight" | "thread"; insight?: string; thread?: string };

export function LearningCard({ learning }: { learning: Learning }) {
  const [editing, setEditing] = useState(false);
  const [aiLoading, setAiLoading] = useState<"insight" | "thread" | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);

  const tags = parseTags(learning.tags);
  const bar = ACCENT[CATEGORY_COLOR[learning.category] ?? "neutral"] ?? ACCENT.neutral;

  async function callAi(mode: "insight" | "thread") {
    setAiLoading(mode);
    try {
      const res = await fetch(`/api/ai/learning-${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningId: learning.id }),
      });
      const data = await res.json();
      setAiResult(mode === "insight" ? { mode, insight: data.insight } : { mode, thread: data.thread });
    } finally {
      setAiLoading(null);
    }
  }

  if (editing) {
    return <LearningForm learning={learning} onDone={() => setEditing(false)} />;
  }

  return (
    <>
      <article className="group rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-700 transition">
        <div className={`h-1.5 w-full ${bar}`} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{learning.category}</span>
            {learning.cluster && (
              <span className="text-[10px] text-neutral-600 truncate max-w-[130px]">· {learning.cluster}</span>
            )}
            <span className="ml-auto text-[10px] text-neutral-700 tabular-nums">
              {new Date(learning.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-white leading-snug">{learning.title}</h3>
          {learning.insight && (
            <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{learning.insight}</p>
          )}

          {learning.evidence && (
            <p className="mt-2 rounded-lg bg-neutral-800/50 px-3 py-2 text-xs text-neutral-500">
              <span className="text-neutral-600">📊 Bewijs: </span>{learning.evidence}
            </p>
          )}
          {learning.action && (
            <p className="mt-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 text-xs text-emerald-300/80">
              <span className="opacity-70">→ Actie: </span>{learning.action}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-500">#{t}</span>
            ))}
            {learning.source && (
              <span className="ml-auto text-[10px] text-neutral-600">bron: {learning.source}</span>
            )}
          </div>

          {/* AI + acties */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => callAi("insight")}
              disabled={aiLoading !== null}
              className="flex items-center gap-1 rounded-lg border border-purple-500/20 bg-purple-500/5 px-2.5 py-1 text-[11px] font-medium text-purple-400 hover:bg-purple-500/10 disabled:opacity-40 transition"
            >
              {aiLoading === "insight" ? "⟳" : "💡"} Inzicht
            </button>
            <button
              onClick={() => callAi("thread")}
              disabled={aiLoading !== null}
              className="flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-40 transition"
            >
              {aiLoading === "thread" ? "⟳" : "🧵"} Rode draad
            </button>

            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => setEditing(true)} className="rounded p-1 text-neutral-600 hover:text-white transition" title="Bewerken">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button
                onClick={() => { if (confirm("Learning verwijderen?")) deleteLearning(learning.id); }}
                className="rounded p-1 text-neutral-600 hover:text-rose-400 transition"
                title="Verwijderen"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      </article>

      {aiResult && (
        <AiResultModal noteId={learning.id} result={aiResult} onClose={() => setAiResult(null)} />
      )}
    </>
  );
}
