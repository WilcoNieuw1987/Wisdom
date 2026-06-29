"use client";

import { useState } from "react";
import { deleteNote, togglePin, toggleArchive, updateNote } from "@/lib/actions";
import { parseTags, isNoteType, type NoteType, TYPE_META } from "@/lib/types";
import { InterviewModal } from "@/components/InterviewModal";

type Note = {
  id: string; title: string; content: string; type: string;
  category: string | null; cluster: string | null; tags: string;
  pinned: boolean; archived: boolean; createdAt: Date; updatedAt: Date;
};

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

function timeAgo(date: Date): string {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1) return "zojuist";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}u`;
  return `${Math.floor(h / 24)}d`;
}

export function NoteCard({ note, types }: { note: Note; types: NoteType[] }) {
  const [editing, setEditing] = useState(false);
  const [interviewing, setInterviewing] = useState(false);
  const tags = parseTags(note.tags);
  const meta = isNoteType(note.type) ? TYPE_META[note.type] : TYPE_META.notitie;
  const bar  = TYPE_BAR[note.type]  ?? TYPE_BAR.notitie;
  const txt  = TYPE_TEXT[note.type] ?? TYPE_TEXT.notitie;

  if (editing) {
    return (
      <div className="break-inside-avoid mb-3">
        <form
          action={async (fd) => { await updateNote(note.id, fd); setEditing(false); }}
          className="rounded-xl border border-neutral-700 bg-neutral-900 overflow-hidden"
        >
          <div className={`h-1 w-full ${bar}`} />
          <div className="p-4">
            <input type="hidden" name="type" value={note.type} />
            <input type="hidden" name="category" value={note.category ?? ""} />
            <input type="hidden" name="tags" value={note.tags} />
            <input
              name="title"
              defaultValue={note.title}
              className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-neutral-600"
              placeholder="Titel"
              autoFocus
            />
            <textarea
              name="content"
              defaultValue={note.content}
              rows={4}
              className="mt-2 w-full resize-none rounded-lg bg-neutral-800 p-2.5 text-xs text-neutral-300 outline-none"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500 hover:text-white transition">Annuleer</button>
              <button type="submit" className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-neutral-200 transition">Opslaan</button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="break-inside-avoid mb-3">
        <article className="group relative rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-700 transition">
          {/* Gekleurde bovenbalk — het "tablabel" */}
          <div className={`h-1.5 w-full ${bar}`} />

          <div className="p-4">
            {/* Type-label + cluster + pin */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${txt}`}>
                {meta.label}
              </span>
              {note.cluster && (
                <span className="text-[10px] text-neutral-600 truncate max-w-[120px]">· {note.cluster}</span>
              )}
              {note.pinned && <span className="ml-auto text-xs opacity-60">📌</span>}

              {/* Acties — verschijnen bij hover */}
              <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                <button
                  title={note.pinned ? "Losmaken" : "Vastpinnen"}
                  onClick={() => togglePin(note.id, !note.pinned)}
                  className="rounded p-1 text-neutral-600 hover:text-white hover:bg-neutral-800 transition"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.293 1.293a1 1 0 0 1 1.414 0l8 8a1 1 0 0 1-1.414 1.414L17 10.414V17a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-3H9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l8-8z" /></svg>
                </button>
                <button
                  title="Bewerken"
                  onClick={() => setEditing(true)}
                  className="rounded p-1 text-neutral-600 hover:text-white hover:bg-neutral-800 transition"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button
                  title={note.archived ? "Terugzetten" : "Archiveren"}
                  onClick={() => toggleArchive(note.id, !note.archived)}
                  className="rounded p-1 text-neutral-600 hover:text-white hover:bg-neutral-800 transition"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </button>
                <button
                  title="Verwijderen"
                  onClick={() => { if (confirm("Verwijderen?")) deleteNote(note.id); }}
                  className="rounded p-1 text-neutral-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            {/* Titel */}
            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
              {note.title}
            </h3>

            {/* Content preview */}
            {note.content && note.content !== note.title && (
              <p className="mt-1.5 text-xs text-neutral-500 line-clamp-4 leading-relaxed">
                {note.content}
              </p>
            )}

            {/* Tags + tijdstip */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-600">
                  #{tag}
                </span>
              ))}
              <span className="ml-auto text-[10px] text-neutral-700 tabular-nums">
                {timeAgo(note.updatedAt)}
              </span>
            </div>

            {/* AI-knop voor ideeën */}
            {note.type === "idee" && (
              <button
                onClick={() => setInterviewing(true)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 py-1.5 text-[11px] font-semibold text-amber-500 hover:border-amber-500/40 hover:bg-amber-500/10 transition"
              >
                ✦ Uitwerken met AI
              </button>
            )}
          </div>
        </article>
      </div>

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
