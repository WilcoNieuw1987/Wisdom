"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/generated/prisma/client";
import { togglePin, toggleArchive, deleteNote, enrichNote } from "@/lib/actions";
import { InterviewModal } from "./InterviewModal";
import { AiResultModal } from "./AiResultModal";
import Link from "next/link";

type FilterType = "idee" | "frustratie" | "notitie" | null;

const TYPE_BAR: Record<string, string> = {
  idee:       "bg-amber-400",
  frustratie: "bg-rose-500",
  notitie:    "bg-sky-500",
};
const TYPE_TEXT: Record<string, string> = {
  idee:       "text-amber-400",
  frustratie: "text-rose-400",
  notitie:    "text-sky-400",
};
const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: null,         label: "Alle" },
  { value: "idee",       label: "💡 Ideeën" },
  { value: "frustratie", label: "😤 Frustraties" },
  { value: "notitie",    label: "📝 Notities" },
];

type AiMode = "actions" | "rewrite" | "insight" | "thread";
type AiResult = {
  mode: AiMode;
  actions?: string[];
  rewrite?: { title: string; content: string };
  insight?: string;
  thread?: string;
};

function timeAgo(date: Date): string {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1) return "zojuist";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}u`;
  return `${Math.floor(h / 24)}d`;
}

export function SwipeView({ initialNotes }: { initialNotes: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [filterType, setFilterType] = useState<FilterType>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState<AiMode | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [, startTransition] = useTransition();

  // Swipe state
  const touchStartY = useRef<number | null>(null);

  const filtered = filterType ? notes.filter((n) => n.type === filterType) : notes;
  const idx = Math.min(currentIndex, Math.max(filtered.length - 1, 0));
  const current = filtered[idx] ?? null;
  const prev    = idx > 0                    ? filtered[idx - 1] : null;
  const next    = idx < filtered.length - 1  ? filtered[idx + 1] : null;

  function goNext() { if (next)  setCurrentIndex(idx + 1); }
  function goPrev() { if (prev)  setCurrentIndex(idx - 1); }

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy < -60) goNext();
    if (dy > 60)  goPrev();
    touchStartY.current = null;
  }

  async function callAi(mode: AiMode) {
    if (!current) return;
    setAiLoading(mode);
    try {
      const endpoint = { actions: "actions", rewrite: "rewrite", insight: "insight", thread: "thread" }[mode];
      const res = await fetch(`/api/ai/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: current.id }),
      });
      const data = await res.json();

      if (mode === "actions") setAiResult({ mode, actions: data.actions });
      else if (mode === "rewrite") setAiResult({ mode, rewrite: data });
      else if (mode === "insight") setAiResult({ mode, insight: data.insight });
      else setAiResult({ mode, thread: data.thread });
    } finally {
      setAiLoading(null);
    }
  }

  function doPin() {
    if (!current) return;
    startTransition(async () => {
      await togglePin(current.id, !current.pinned);
      setNotes((ns) => ns.map((n) => n.id === current.id ? { ...n, pinned: !n.pinned } : n));
    });
  }
  function doArchive() {
    if (!current) return;
    startTransition(async () => {
      await toggleArchive(current.id, true);
      setNotes((ns) => ns.filter((n) => n.id !== current.id));
      setCurrentIndex((i) => Math.max(0, i - 1));
    });
  }
  function doDelete() {
    if (!current || !confirm("Verwijderen?")) return;
    startTransition(async () => {
      await deleteNote(current.id);
      setNotes((ns) => ns.filter((n) => n.id !== current.id));
      setCurrentIndex((i) => Math.max(0, i - 1));
    });
  }

  const AI_BUTTONS: { mode: AiMode; icon: string; label: string; color: string; bg: string }[] = [
    { mode: "actions", icon: "⚡", label: "Actiepunten",  color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20" },
    { mode: "insight", icon: "💡", label: "Inzicht",      color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20" },
    { mode: "rewrite", icon: "🔄", label: "Herschrijven", color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20 hover:bg-green-500/20" },
    { mode: "thread",  icon: "🧵", label: "Rode draad",   color: "text-rose-300",   bg: "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20" },
  ];

  return (
    <div
      className="fixed inset-0 flex flex-col bg-neutral-950 text-white overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-4 border-b border-neutral-900 shrink-0"
        style={{ paddingTop: "max(14px, env(safe-area-inset-top))", paddingBottom: "10px" }}
      >
        <Link href="/" className="text-neutral-600 hover:text-white transition text-lg leading-none shrink-0">←</Link>
        <div className="flex flex-1 gap-1.5 overflow-x-auto no-scrollbar">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value ?? "all"}
              onClick={() => { setFilterType(f.value); setCurrentIndex(0); }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                filterType === f.value ? "bg-white text-black" : "text-neutral-500 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-neutral-700 shrink-0 tabular-nums ml-1">
          {filtered.length > 0 ? `${idx + 1}/${filtered.length}` : "—"}
        </span>
      </div>

      {/* ── Note carousel ── */}
      <div
        className="flex-1 flex flex-col min-h-0 px-4 py-3 gap-2"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Previous peek */}
        <button
          onClick={goPrev}
          disabled={!prev}
          className={`shrink-0 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-left transition ${
            prev ? "opacity-30 hover:opacity-50" : "opacity-0 pointer-events-none"
          }`}
        >
          {prev && (
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_BAR[prev.type] ?? "bg-neutral-500"}`} />
              <span className="text-xs text-neutral-400 truncate">{prev.title}</span>
              <span className="ml-auto text-[10px] text-neutral-700">↑</span>
            </div>
          )}
        </button>

        {/* Current note */}
        <div className={`flex-1 rounded-2xl border border-neutral-700 bg-neutral-900 overflow-hidden flex flex-col ${!current ? "items-center justify-center" : ""}`}>
          {current ? (
            <>
              <div className={`h-1.5 w-full ${TYPE_BAR[current.type] ?? "bg-neutral-700"}`} />
              <div className="flex-1 p-5 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[11px] font-semibold uppercase tracking-widest ${TYPE_TEXT[current.type] ?? "text-neutral-400"}`}>
                    {current.type === "idee" ? "Idee" : current.type === "frustratie" ? "Frustratie" : "Notitie"}
                  </span>
                  {current.cluster && (
                    <span className="text-[10px] text-neutral-600 bg-neutral-800 rounded-full px-2 py-0.5 truncate max-w-[130px]">
                      {current.cluster}
                    </span>
                  )}
                  {current.pinned && <span className="ml-auto text-xs opacity-50">📌</span>}
                </div>
                <h2 className="text-base font-bold text-white leading-snug">{current.title}</h2>
                {current.content && current.content !== current.title && (
                  <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{current.content}</p>
                )}
                {current.tags && (
                  <p className="mt-3 text-xs text-neutral-700">{current.tags}</p>
                )}
                <p className="mt-4 text-[10px] text-neutral-800">{timeAgo(current.updatedAt)}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-600 text-center px-6">Geen notities. Voeg er een toe via de hoofdpagina.</p>
          )}
        </div>

        {/* Next peek */}
        <button
          onClick={goNext}
          disabled={!next}
          className={`shrink-0 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-left transition ${
            next ? "opacity-30 hover:opacity-50" : "opacity-0 pointer-events-none"
          }`}
        >
          {next && (
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_BAR[next.type] ?? "bg-neutral-500"}`} />
              <span className="text-xs text-neutral-400 truncate">{next.title}</span>
              <span className="ml-auto text-[10px] text-neutral-700">↓</span>
            </div>
          )}
        </button>
      </div>

      {/* ── Actiegebied ── */}
      <div className="shrink-0 px-4 pb-4 space-y-2">
        {/* Interview knop (ideeën) */}
        {current?.type === "idee" && (
          <button
            onClick={() => setInterviewOpen(true)}
            disabled={!current}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition"
          >
            <span>✦</span> Uitwerken met AI
          </button>
        )}

        {/* 2×2 AI-grid */}
        <div className="grid grid-cols-2 gap-2">
          {AI_BUTTONS.map(({ mode, icon, label, color, bg }) => (
            <button
              key={mode}
              onClick={() => callAi(mode)}
              disabled={!current || aiLoading !== null}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-center transition disabled:opacity-30 ${bg}`}
            >
              {aiLoading === mode ? (
                <span className="animate-spin text-lg">⟳</span>
              ) : (
                <span className="text-xl leading-none">{icon}</span>
              )}
              <span className={`text-[10px] font-medium ${color}`}>{label}</span>
            </button>
          ))}
        </div>

        {/* Utility-rij */}
        <div className="flex gap-2">
          <button
            onClick={doPin}
            disabled={!current}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 py-2 text-xs text-neutral-500 hover:text-white hover:border-neutral-600 transition disabled:opacity-30"
          >
            📌 <span>{current?.pinned ? "Losmaken" : "Vastzetten"}</span>
          </button>
          <button
            onClick={doArchive}
            disabled={!current}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 py-2 text-xs text-neutral-500 hover:text-white hover:border-neutral-600 transition disabled:opacity-30"
          >
            🗄 <span>Archiveer</span>
          </button>
          <button
            onClick={doDelete}
            disabled={!current}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 py-2 text-xs text-neutral-500 hover:text-rose-400 hover:border-rose-500/30 transition disabled:opacity-30"
          >
            🗑 <span>Verwijder</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {interviewOpen && current && (
        <InterviewModal
          noteId={current.id}
          title={current.title}
          content={current.content}
          onClose={() => { setInterviewOpen(false); router.refresh(); }}
        />
      )}
      {aiResult && current && (
        <AiResultModal
          noteId={current.id}
          result={aiResult}
          onClose={() => setAiResult(null)}
        />
      )}
    </div>
  );
}
