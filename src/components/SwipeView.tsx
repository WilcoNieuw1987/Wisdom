"use client";

import { forwardRef, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/generated/prisma/client";
import { togglePin, toggleArchive, deleteNote } from "@/lib/actions";
import { InterviewModal } from "./InterviewModal";
import Link from "next/link";

type FilterType = "idee" | "frustratie" | "notitie" | null;

interface ActionDef {
  id: string;
  icon: string;
  label: string;
  activeClass: string;
  idleColor: string;
}

const LEFT_ACTIONS: ActionDef[] = [
  { id: "interview", icon: "✦",  label: "Uitwerken",  activeClass: "bg-amber-500 border-amber-500 text-white",  idleColor: "text-amber-500/50" },
  { id: "pin",       icon: "📌", label: "Vastzetten", activeClass: "bg-blue-600 border-blue-600 text-white",    idleColor: "text-blue-400/50" },
  { id: "archive",   icon: "🗄", label: "Archiveren", activeClass: "bg-neutral-600 border-neutral-600 text-white", idleColor: "text-neutral-500" },
];

const RIGHT_ACTIONS: ActionDef[] = [
  { id: "edit",   icon: "✏️", label: "Bewerken",  activeClass: "bg-green-600 border-green-600 text-white",  idleColor: "text-green-500/50" },
  { id: "graph",  icon: "🕸",  label: "Graph",     activeClass: "bg-purple-600 border-purple-600 text-white", idleColor: "text-purple-500/50" },
  { id: "delete", icon: "🗑",  label: "Verwijder", activeClass: "bg-rose-600 border-rose-600 text-white",    idleColor: "text-rose-500/50" },
];

const TYPE_DOT: Record<string, string> = {
  idee: "bg-amber-400",
  frustratie: "bg-rose-400",
  notitie: "bg-sky-400",
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: null,          label: "Alle" },
  { value: "idee",        label: "💡 Ideeën" },
  { value: "frustratie",  label: "😤 Frustraties" },
  { value: "notitie",     label: "📝 Notities" },
];

const ActionBox = forwardRef<HTMLDivElement, { action: ActionDef; isHovered: boolean }>(
  ({ action, isHovered }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col items-center justify-center rounded-2xl border transition-all duration-150 select-none ${
        isHovered
          ? `${action.activeClass} scale-105 shadow-lg shadow-black/40`
          : `border-neutral-800 bg-neutral-900 ${action.idleColor}`
      }`}
    >
      <span className="text-2xl leading-none">{action.icon}</span>
      <span className="mt-1.5 text-[10px] font-medium text-center leading-tight px-1">
        {action.label}
      </span>
    </div>
  )
);
ActionBox.displayName = "ActionBox";

export function SwipeView({ initialNotes }: { initialNotes: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [filterType, setFilterType] = useState<FilterType>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interviewNote, setInterviewNote] = useState<Note | null>(null);
  const [, startTransition] = useTransition();

  // Drag state via refs to avoid stale closures in pointer handlers
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragAxisRef = useRef<"h" | "v" | null>(null);

  const [isDraggingH, setIsDraggingH] = useState(false);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const actionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredNotes = filterType ? notes.filter((n) => n.type === filterType) : notes;
  const current = filteredNotes[currentIndex] ?? null;
  const prev    = currentIndex > 0                          ? filteredNotes[currentIndex - 1] : null;
  const next    = currentIndex < filteredNotes.length - 1  ? filteredNotes[currentIndex + 1] : null;

  function hitTest(x: number, y: number): string | null {
    for (const [id, el] of Object.entries(actionRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragAxisRef.current = null;
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!dragAxisRef.current && Math.hypot(dx, dy) > 12) {
      dragAxisRef.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }

    if (dragAxisRef.current === "h") {
      setIsDraggingH(true);
      setGhostPos({ x: e.clientX, y: e.clientY });
      setHoveredAction(hitTest(e.clientX, e.clientY));
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current) return;

    const dy = e.clientY - dragStartRef.current.y;

    if (dragAxisRef.current === "h" && hoveredAction) {
      executeAction(hoveredAction);
    } else if (dragAxisRef.current === "v") {
      if (dy < -60 && next) setCurrentIndex((i) => i + 1);
      if (dy > 60  && prev) setCurrentIndex((i) => i - 1);
    }

    dragStartRef.current = null;
    dragAxisRef.current  = null;
    setIsDraggingH(false);
    setHoveredAction(null);
  }

  function onPointerCancel() {
    dragStartRef.current = null;
    dragAxisRef.current  = null;
    setIsDraggingH(false);
    setHoveredAction(null);
  }

  function executeAction(actionId: string) {
    if (!current) return;

    if (actionId === "interview") { setInterviewNote(current); return; }
    if (actionId === "graph")     { router.push("/graph");     return; }
    if (actionId === "edit")      { router.push("/");          return; }

    startTransition(async () => {
      if (actionId === "pin") {
        await togglePin(current.id, !current.pinned);
        setNotes((ns) => ns.map((n) => n.id === current.id ? { ...n, pinned: !n.pinned } : n));
      } else if (actionId === "archive") {
        await toggleArchive(current.id, true);
        setNotes((ns) => ns.filter((n) => n.id !== current.id));
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (actionId === "delete") {
        await deleteNote(current.id);
        setNotes((ns) => ns.filter((n) => n.id !== current.id));
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
    });
  }

  function changeFilter(f: FilterType) {
    setFilterType(f);
    setCurrentIndex(0);
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950 text-white overflow-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Header — filters */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0 border-b border-neutral-900" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <Link href="/" className="text-sm text-neutral-600 hover:text-white transition shrink-0 pr-1">←</Link>
        <div className="flex flex-1 gap-1.5 overflow-x-auto no-scrollbar">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value ?? "all"}
              onClick={() => changeFilter(f.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs transition ${
                filterType === f.value
                  ? "bg-white text-black font-semibold"
                  : "text-neutral-500 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-neutral-700 shrink-0 ml-1 tabular-nums">
          {filteredNotes.length > 0 ? `${currentIndex + 1}/${filteredNotes.length}` : "—"}
        </span>
      </div>

      {/* 3 × 3 grid */}
      <div
        className="flex-1 grid gap-2 p-2 min-h-0"
        style={{
          gridTemplateColumns: "76px 1fr 76px",
          gridTemplateRows: "1fr 2fr 1fr",
        }}
      >
        {/* ── Row 1 ── */}
        <ActionBox
          action={LEFT_ACTIONS[0]}
          isHovered={hoveredAction === LEFT_ACTIONS[0].id}
          ref={(el) => { actionRefs.current[LEFT_ACTIONS[0].id] = el; }}
        />

        {/* Previous note — dimmed */}
        <div className="flex items-end pb-2 opacity-25 pointer-events-none select-none">
          {prev ? (
            <div className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[prev.type] ?? "bg-neutral-500"}`} />
                <span className="text-xs text-neutral-300 truncate">{prev.title}</span>
              </div>
            </div>
          ) : (
            <p className="w-full text-center text-[10px] text-neutral-800">— begin —</p>
          )}
        </div>

        <ActionBox
          action={RIGHT_ACTIONS[0]}
          isHovered={hoveredAction === RIGHT_ACTIONS[0].id}
          ref={(el) => { actionRefs.current[RIGHT_ACTIONS[0].id] = el; }}
        />

        {/* ── Row 2 — current note (draggable) ── */}
        <ActionBox
          action={LEFT_ACTIONS[1]}
          isHovered={hoveredAction === LEFT_ACTIONS[1].id}
          ref={(el) => { actionRefs.current[LEFT_ACTIONS[1].id] = el; }}
        />

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className={`relative overflow-hidden rounded-2xl border transition-all duration-150 select-none ${
            isDraggingH
              ? "border-neutral-600 bg-neutral-800 scale-95 opacity-70"
              : "border-neutral-700 bg-neutral-900 active:scale-[0.98]"
          }`}
          style={{ touchAction: "none", cursor: isDraggingH ? "grabbing" : "grab" }}
        >
          {current ? (
            <div className="h-full p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[current.type] ?? "bg-neutral-500"}`} />
                {current.cluster && (
                  <span className="text-[10px] text-neutral-600 bg-neutral-800 rounded-full px-2 py-0.5 truncate max-w-[100px]">
                    {current.cluster}
                  </span>
                )}
                {current.pinned && <span className="ml-auto text-[10px] text-blue-400">📌</span>}
              </div>

              <h2 className="text-sm font-semibold text-white leading-snug line-clamp-3">
                {current.title}
              </h2>

              {current.content && current.content !== current.title && (
                <p className="mt-2 text-xs text-neutral-400 leading-relaxed line-clamp-8">
                  {current.content}
                </p>
              )}

              {current.tags && (
                <p className="mt-2 text-[10px] text-neutral-700 truncate">{current.tags}</p>
              )}

              {/* Hint */}
              <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-neutral-800 pointer-events-none">
                ← sleep naar actie &nbsp;·&nbsp; swipe ↕ voor volgende
              </p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-xs text-neutral-600 text-center px-4">
                Geen notities.{"\n"}Voeg er een toe op de hoofdpagina.
              </p>
            </div>
          )}
        </div>

        <ActionBox
          action={RIGHT_ACTIONS[1]}
          isHovered={hoveredAction === RIGHT_ACTIONS[1].id}
          ref={(el) => { actionRefs.current[RIGHT_ACTIONS[1].id] = el; }}
        />

        {/* ── Row 3 ── */}
        <ActionBox
          action={LEFT_ACTIONS[2]}
          isHovered={hoveredAction === LEFT_ACTIONS[2].id}
          ref={(el) => { actionRefs.current[LEFT_ACTIONS[2].id] = el; }}
        />

        {/* Next note — dimmed */}
        <div className="flex items-start pt-2 opacity-25 pointer-events-none select-none">
          {next ? (
            <div className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[next.type] ?? "bg-neutral-500"}`} />
                <span className="text-xs text-neutral-300 truncate">{next.title}</span>
              </div>
            </div>
          ) : (
            <p className="w-full text-center text-[10px] text-neutral-800">— einde —</p>
          )}
        </div>

        <ActionBox
          action={RIGHT_ACTIONS[2]}
          isHovered={hoveredAction === RIGHT_ACTIONS[2].id}
          ref={(el) => { actionRefs.current[RIGHT_ACTIONS[2].id] = el; }}
        />
      </div>

      {/* Ghost card — follows finger during horizontal drag */}
      {isDraggingH && current && (
        <div
          className="fixed pointer-events-none z-50 rounded-xl border border-neutral-600 bg-neutral-800 px-3 py-2 shadow-2xl"
          style={{
            left: ghostPos.x - 60,
            top: ghostPos.y - 24,
            transform: "rotate(-4deg) scale(0.9)",
            maxWidth: 160,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[current.type] ?? "bg-neutral-500"}`} />
            <span className="text-xs text-white truncate">{current.title}</span>
          </div>
        </div>
      )}

      {/* Interview modal */}
      {interviewNote && (
        <InterviewModal
          noteId={interviewNote.id}
          title={interviewNote.title}
          content={interviewNote.content}
          onClose={() => {
            setInterviewNote(null);
            // Refresh note title in local state via router
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
