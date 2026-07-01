"use client";

import { forwardRef, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/generated/prisma/client";
import { togglePin, toggleArchive, deleteNote } from "@/lib/actions";
import { InterviewModal } from "./InterviewModal";
import { AiResultModal } from "./AiResultModal";
import Link from "next/link";

type FilterType = "idee" | "frustratie" | "notitie" | null;
type AiMode = "actions" | "rewrite" | "insight" | "thread";
type BoxId = "interview" | AiMode | "archive";

type AiResult = {
  mode: AiMode;
  actions?: string[];
  rewrite?: { title: string; content: string };
  insight?: string;
  thread?: string;
};

const TYPE_BAR: Record<string, string> = {
  idee: "bg-amber-400",
  frustratie: "bg-rose-500",
  notitie: "bg-sky-500",
};
const TYPE_TEXT: Record<string, string> = {
  idee: "text-amber-400",
  frustratie: "text-rose-400",
  notitie: "text-sky-400",
};
const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: null, label: "Alle" },
  { value: "idee", label: "💡 Ideeën" },
  { value: "frustratie", label: "😤 Frustraties" },
  { value: "notitie", label: "📝 Notities" },
];

interface BoxDef {
  id: BoxId;
  icon: string;
  label: string;
  active: string; // classes wanneer aangewezen tijdens slepen
  idle: string;   // tekstkleur in rust
}

const LEFT_BOXES: BoxDef[] = [
  { id: "interview", icon: "✦",  label: "Uitwerken",  active: "bg-amber-500 border-amber-500 text-white",   idle: "text-amber-400" },
  { id: "insight",   icon: "💡", label: "Inzicht",    active: "bg-purple-600 border-purple-600 text-white", idle: "text-purple-400" },
  { id: "thread",    icon: "🧵", label: "Rode draad", active: "bg-rose-600 border-rose-600 text-white",     idle: "text-rose-300" },
];
const RIGHT_BOXES: BoxDef[] = [
  { id: "actions",   icon: "⚡", label: "Acties",     active: "bg-yellow-500 border-yellow-500 text-black", idle: "text-yellow-400" },
  { id: "rewrite",   icon: "🔄", label: "Herschrijf", active: "bg-green-600 border-green-600 text-white",   idle: "text-green-400" },
  { id: "archive",   icon: "🗄", label: "Archief",    active: "bg-neutral-600 border-neutral-600 text-white", idle: "text-neutral-400" },
];

function timeAgo(date: Date): string {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1) return "zojuist";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}u`;
  return `${Math.floor(h / 24)}d`;
}

const FuncBox = forwardRef<
  HTMLButtonElement,
  { box: BoxDef; hovered: boolean; loading: boolean; disabled: boolean; onTap: () => void }
>(({ box, hovered, loading, disabled, onTap }, ref) => (
  <button
    ref={ref}
    onClick={onTap}
    disabled={disabled}
    className={`flex flex-1 flex-col items-center justify-center rounded-2xl border transition-all duration-150 select-none disabled:opacity-25 ${
      hovered
        ? `${box.active} scale-105 shadow-lg shadow-black/50`
        : `border-neutral-800 bg-neutral-900 ${box.idle} active:bg-neutral-800`
    }`}
  >
    <span className="text-xl leading-none">{loading ? "⟳" : box.icon}</span>
    <span className="mt-1 text-[9px] font-medium leading-tight text-center px-0.5">{box.label}</span>
  </button>
));
FuncBox.displayName = "FuncBox";

export function SwipeView({ initialNotes }: { initialNotes: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [filterType, setFilterType] = useState<FilterType>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState<AiMode | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [anim, setAnim] = useState<"next" | "prev" | null>(null);
  const [, startTransition] = useTransition();

  // Sleep-status (via refs om stale closures te vermijden)
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragAxis = useRef<"h" | "v" | null>(null);
  const [draggingH, setDraggingH] = useState(false);
  const [ghost, setGhost] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<BoxId | null>(null);
  const boxRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const filtered = filterType ? notes.filter((n) => n.type === filterType) : notes;
  const idx = Math.min(currentIndex, Math.max(filtered.length - 1, 0));
  const current = filtered[idx] ?? null;
  const prev = idx > 0 ? filtered[idx - 1] : null;
  const next = idx < filtered.length - 1 ? filtered[idx + 1] : null;

  function goNext() { if (next) { setAnim("next"); setCurrentIndex(idx + 1); } }
  function goPrev() { if (prev) { setAnim("prev"); setCurrentIndex(idx - 1); } }

  function hitTest(x: number, y: number): BoxId | null {
    for (const [id, el] of Object.entries(boxRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id as BoxId;
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragAxis.current = null;
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!dragAxis.current && Math.hypot(dx, dy) > 10) {
      dragAxis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (dragAxis.current === "h") {
      setDraggingH(true);
      setGhost({ x: e.clientX, y: e.clientY });
      setHovered(hitTest(e.clientX, e.clientY));
    }
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const dy = e.clientY - dragStart.current.y;
    if (dragAxis.current === "h" && hovered) {
      execute(hovered);
    } else if (dragAxis.current === "v") {
      if (dy < -55) goNext();
      if (dy > 55) goPrev();
    }
    dragStart.current = null;
    dragAxis.current = null;
    setDraggingH(false);
    setHovered(null);
  }
  function onPointerCancel() {
    dragStart.current = null;
    dragAxis.current = null;
    setDraggingH(false);
    setHovered(null);
  }

  async function callAi(mode: AiMode) {
    if (!current) return;
    setAiLoading(mode);
    try {
      const res = await fetch(`/api/ai/${mode}`, {
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

  function execute(id: BoxId) {
    if (!current) return;
    if (id === "interview") {
      if (current.type === "idee") setInterviewOpen(true);
      return;
    }
    if (id === "archive") {
      startTransition(async () => {
        await toggleArchive(current.id, true);
        setNotes((ns) => ns.filter((n) => n.id !== current.id));
        setCurrentIndex((i) => Math.max(0, i - 1));
      });
      return;
    }
    callAi(id);
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-neutral-950 text-white overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* ── Header / menu ── */}
      <div
        className="flex w-full max-w-xl mx-auto items-center gap-2 px-3 border-b border-neutral-900 shrink-0"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))", paddingBottom: "10px" }}
      >
        <Link href="/" className="shrink-0 text-neutral-600 hover:text-white transition text-lg leading-none">←</Link>
        <div className="flex flex-1 gap-1.5 overflow-x-auto no-scrollbar">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value ?? "all"}
              onClick={() => { setFilterType(f.value); setCurrentIndex(0); setAnim(null); }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                filterType === f.value ? "bg-white text-black" : "text-neutral-500 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="shrink-0 text-xs text-neutral-700 tabular-nums">
          {filtered.length > 0 ? `${idx + 1}/${filtered.length}` : "—"}
        </span>
      </div>

      {/* ── 3-koloms grid: functies | notitie | functies ── */}
      <div className="flex-1 flex w-full max-w-xl mx-auto gap-2 p-2 min-h-0">
        {/* Linkerkolom */}
        <div className="flex w-[68px] shrink-0 flex-col gap-2">
          {LEFT_BOXES.map((box) => (
            <FuncBox
              key={box.id}
              box={box}
              hovered={hovered === box.id}
              loading={aiLoading === box.id}
              disabled={!current || (box.id === "interview" && current?.type !== "idee")}
              onTap={() => execute(box.id)}
              ref={(el) => { boxRefs.current[box.id] = el; }}
            />
          ))}
        </div>

        {/* Middenkolom: vorige peek / notitie / volgende peek */}
        <div className="flex flex-1 flex-col gap-2 min-w-0">
          {/* Vorige */}
          <button
            onClick={goPrev}
            disabled={!prev}
            className={`shrink-0 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-left transition ${
              prev ? "opacity-30 active:opacity-60" : "opacity-0 pointer-events-none"
            }`}
          >
            {prev && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-700">↑</span>
                <span className="text-xs text-neutral-400 truncate">{prev.title}</span>
              </div>
            )}
          </button>

          {/* Huidige notitie — sleepbaar */}
          <div
            key={current ? current.id : "empty"}
            onPointerDown={current ? onPointerDown : undefined}
            onPointerMove={current ? onPointerMove : undefined}
            onPointerUp={current ? onPointerUp : undefined}
            onPointerCancel={onPointerCancel}
            className={`relative flex-1 overflow-hidden rounded-2xl border transition-all duration-150 ${
              draggingH
                ? "border-neutral-600 bg-neutral-800 scale-95 opacity-70"
                : "border-neutral-700 bg-neutral-900"
            } ${anim === "next" ? "anim-next" : anim === "prev" ? "anim-prev" : ""}`}
            style={{ touchAction: "none", cursor: draggingH ? "grabbing" : current ? "grab" : "default" }}
          >
            {current ? (
              <>
                <div className={`h-1.5 w-full ${TYPE_BAR[current.type] ?? "bg-neutral-700"}`} />
                <div className="flex h-[calc(100%-6px)] flex-col p-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${TYPE_TEXT[current.type] ?? "text-neutral-400"}`}>
                      {current.type === "idee" ? "Idee" : current.type === "frustratie" ? "Frustratie" : "Notitie"}
                    </span>
                    {current.cluster && (
                      <span className="truncate rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-500 max-w-[110px]">
                        {current.cluster}
                      </span>
                    )}
                    {/* Pin + verwijder — kleine icoontjes */}
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(current.id, !current.pinned); setNotes((ns) => ns.map((n) => n.id === current.id ? { ...n, pinned: !n.pinned } : n)); }}
                        className={`rounded p-1 transition ${current.pinned ? "text-blue-400" : "text-neutral-600 hover:text-white"}`}
                      >
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.293 1.293a1 1 0 0 1 1.414 0l8 8a1 1 0 0 1-1.414 1.414L17 10.414V17a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-3H9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l8-8z" /></svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!confirm("Verwijderen?")) return;
                          startTransition(async () => {
                            await deleteNote(current.id);
                            setNotes((ns) => ns.filter((n) => n.id !== current.id));
                            setCurrentIndex((i) => Math.max(0, i - 1));
                          });
                        }}
                        className="rounded p-1 text-neutral-600 hover:text-rose-400 transition"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </span>
                  </div>

                  <h2 className="mt-2 text-base font-bold leading-snug text-white line-clamp-3">{current.title}</h2>
                  {current.content && current.content !== current.title && (
                    <p className="mt-2 flex-1 overflow-hidden text-sm leading-relaxed text-neutral-400">
                      {current.content}
                    </p>
                  )}
                  <p className="mt-2 shrink-0 text-center text-[10px] text-neutral-800">
                    ← sleep naar een functie · swipe ↕ voor volgende
                  </p>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <p className="text-center text-sm text-neutral-600">
                  Geen notities. Voeg er een toe op de{" "}
                  <Link href="/" className="text-neutral-400 underline">hoofdpagina</Link>.
                </p>
              </div>
            )}
          </div>

          {/* Volgende */}
          <button
            onClick={goNext}
            disabled={!next}
            className={`shrink-0 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-left transition ${
              next ? "opacity-30 active:opacity-60" : "opacity-0 pointer-events-none"
            }`}
          >
            {next && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-700">↓</span>
                <span className="text-xs text-neutral-400 truncate">{next.title}</span>
              </div>
            )}
          </button>
        </div>

        {/* Rechterkolom */}
        <div className="flex w-[68px] shrink-0 flex-col gap-2">
          {RIGHT_BOXES.map((box) => (
            <FuncBox
              key={box.id}
              box={box}
              hovered={hovered === box.id}
              loading={aiLoading === box.id}
              disabled={!current}
              onTap={() => execute(box.id)}
              ref={(el) => { boxRefs.current[box.id] = el; }}
            />
          ))}
        </div>
      </div>

      {/* Ghost — volgt de vinger bij horizontaal slepen */}
      {draggingH && current && (
        <div
          className="pointer-events-none fixed z-50 rounded-xl border border-neutral-600 bg-neutral-800 px-3 py-2 shadow-2xl"
          style={{ left: ghost.x - 60, top: ghost.y - 22, transform: "rotate(-4deg) scale(0.9)", maxWidth: 150 }}
        >
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_BAR[current.type] ?? "bg-neutral-500"}`} />
            <span className="truncate text-xs text-white">{current.title}</span>
          </div>
        </div>
      )}

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
        <AiResultModal noteId={current.id} result={aiResult} onClose={() => setAiResult(null)} />
      )}
    </div>
  );
}
