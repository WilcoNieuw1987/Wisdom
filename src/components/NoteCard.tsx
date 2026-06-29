"use client";

import { useState } from "react";
import { deleteNote, togglePin, toggleArchive, updateNote, enrichNote } from "@/lib/actions";
import { parseTags, isNoteType, type NoteType, TYPE_META } from "@/lib/types";
import { InterviewModal } from "@/components/InterviewModal";

type Note = {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string | null;
  cluster: string | null;
  tags: string;
  pinned: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const TYPE_ACCENT: Record<string, string> = {
  idee: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  frustratie: "text-rose-400 border-rose-500/20 bg-rose-500/5",
  notitie: "text-sky-400 border-sky-500/20 bg-sky-500/5",
};

const TYPE_DOT: Record<string, string> = {
  idee: "bg-amber-400",
  frustratie: "bg-rose-400",
  notitie: "bg-sky-400",
};

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "zojuist";
  if (m < 60) return `${m}m geleden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}u geleden`;
  return `${Math.floor(h / 24)}d geleden`;
}

export function NoteCard({ note, types }: { note: Note; types: NoteType[] }) {
  const [editing, setEditing] = useState(false);
  const [interviewing, setInterviewing] = useState(false);
  const tags = parseTags(note.tags);
  const meta = isNoteType(note.type) ? TYPE_META[note.type] : TYPE_META.notitie;
  const accent = TYPE_ACCENT[note.type] ?? TYPE_ACCENT.notitie;
  const dot = TYPE_DOT[note.type] ?? TYPE_DOT.notitie;

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await updateNote(note.id, fd);
          setEditing(false);
        }}
        className="rounded-2xl border border-neutral-700 bg-neutral-900 p-5"
      >
        <input type="hidden" name="type" value={note.type} />
        <input type="hidden" name="category" value={note.category ?? ""} />
        <input type="hidden" name="tags" value={note.tags} />
        <input
          name="title"
          defaultValue={note.title}
          className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-neutral-600"
          placeholder="Titel"
        />
        <textarea
          name="content"
          defaultValue={note.content}
          rows={4}
          className="mt-3 w-full resize-none rounded-xl bg-neutral-800 p-3 text-sm text-neutral-200 outline-none"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-xl px-3 py-1.5 text-sm text-neutral-500 hover:text-white transition"
          >
            Annuleer
          </button>
          <button
            type="submit"
            className="rounded-xl bg-white px-4 py-1.5 text-sm font-semibold text-black hover:bg-neutral-200 transition"
          >
            Opslaan
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <article className={`group relative rounded-2xl border bg-neutral-900 p-5 transition-all hover:border-neutral-600 ${accent}`}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
            <span className="text-xs font-medium uppercase tracking-widest opacity-60">
              {meta.label}
            </span>
            {note.cluster && (
              <span className="rounded-full border border-current/20 bg-current/5 px-2 py-0.5 text-xs opacity-70">
                {note.cluster}
              </span>
            )}
            {note.pinned && <span className="text-xs">📌</span>}
          </div>

          {/* Acties — altijd zichtbaar op mobiel, hover op desktop */}
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              title={note.pinned ? "Losmaken" : "Vastpinnen"}
              onClick={() => togglePin(note.id, !note.pinned)}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-white transition"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.293 1.293a1 1 0 0 1 1.414 0l8 8a1 1 0 0 1-1.414 1.414L17 10.414V17a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-3H9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l8-8z" />
              </svg>
            </button>
            <button
              title="Bewerken"
              onClick={() => setEditing(true)}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-white transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              title={note.archived ? "Terugzetten" : "Archiveren"}
              onClick={() => toggleArchive(note.id, !note.archived)}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-white transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
            <button
              title="Verwijderen"
              onClick={() => {
                if (confirm("Verwijderen?")) deleteNote(note.id);
              }}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Titel */}
        <h3 className="mt-2 text-base font-semibold text-white leading-snug">
          {note.title}
        </h3>

        {/* Content */}
        {note.content && note.content !== note.title && (
          <p className="mt-1.5 text-sm text-neutral-400 line-clamp-3 leading-relaxed">
            {note.content}
          </p>
        )}

        {/* Footer */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500"
            >
              #{tag}
            </span>
          ))}
          <span className="ml-auto text-xs text-neutral-600">
            {timeAgo(note.updatedAt)}
          </span>
        </div>

        {/* AI-knop — altijd zichtbaar op ideeën */}
        {note.type === "idee" && (
          <button
            onClick={() => setInterviewing(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-semibold text-amber-400 transition hover:border-amber-400/60 hover:bg-amber-500/20"
          >
            <span className="text-base">✦</span>
            Uitwerken met AI
          </button>
        )}
      </article>

      {interviewing && (
        <InterviewModal
          noteId={note.id}
          title={note.title}
          content={note.content}
          onClose={() => setInterviewing(false)}
        />
      )}
    </>
  );
}
