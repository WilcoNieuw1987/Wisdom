"use client";

import { useState } from "react";
import {
  deleteNote,
  togglePin,
  toggleArchive,
  updateNote,
} from "@/lib/actions";
import { TYPE_META, parseTags, isNoteType, type NoteType } from "@/lib/types";
import { InterviewModal } from "@/components/InterviewModal";

type Note = {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string | null;
  tags: string;
  pinned: boolean;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NoteCard({ note, types }: { note: Note; types: NoteType[] }) {
  const [editing, setEditing] = useState(false);
  const [interviewing, setInterviewing] = useState(false);
  const meta = isNoteType(note.type) ? TYPE_META[note.type] : TYPE_META.notitie;
  const tags = parseTags(note.tags);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await updateNote(note.id, formData);
          setEditing(false);
        }}
        className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        <select
          name="type"
          defaultValue={note.type}
          className="mb-2 rounded-lg bg-neutral-50 px-2 py-1 text-sm dark:bg-neutral-800"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_META[t].emoji} {TYPE_META[t].label}
            </option>
          ))}
        </select>
        <input
          name="title"
          defaultValue={note.title}
          className="w-full bg-transparent text-lg font-medium outline-none"
        />
        <textarea
          name="content"
          defaultValue={note.content}
          rows={4}
          className="mt-2 w-full resize-y rounded-lg bg-neutral-50 p-3 text-sm outline-none dark:bg-neutral-800"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            name="category"
            defaultValue={note.category ?? ""}
            placeholder="Categorie"
            className="flex-1 rounded-lg bg-neutral-50 px-3 py-2 text-sm outline-none dark:bg-neutral-800"
          />
          <input
            name="tags"
            defaultValue={tags.join(", ")}
            placeholder="Tags, komma-gescheiden"
            className="flex-1 rounded-lg bg-neutral-50 px-3 py-2 text-sm outline-none dark:bg-neutral-800"
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Annuleren
          </button>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
          >
            Opslaan
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="group rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>
              {meta.emoji} {meta.label}
            </span>
            {note.category && (
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
                {note.category}
              </span>
            )}
            {note.pinned && <span title="Vastgepind">📌</span>}
          </div>
          <h3 className="mt-1 truncate text-lg font-medium">{note.title}</h3>
        </div>

        <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
          {note.type === "idee" && (
            <button
              title="Interview-modus: idee uitwerken"
              onClick={() => setInterviewing(true)}
              className="rounded p-1.5 text-sm hover:bg-amber-100 dark:hover:bg-amber-950"
            >
              🎙️
            </button>
          )}
          <button
            title={note.pinned ? "Losmaken" : "Vastpinnen"}
            onClick={() => togglePin(note.id, !note.pinned)}
            className="rounded p-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            📌
          </button>
          <button
            title="Bewerken"
            onClick={() => setEditing(true)}
            className="rounded p-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ✏️
          </button>
          <button
            title={note.archived ? "Terugzetten" : "Archiveren"}
            onClick={() => toggleArchive(note.id, !note.archived)}
            className="rounded p-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {note.archived ? "♻️" : "📥"}
          </button>
          <button
            title="Verwijderen"
            onClick={() => {
              if (confirm("Deze aantekening definitief verwijderen?"))
                deleteNote(note.id);
            }}
            className="rounded p-1.5 text-sm hover:bg-rose-100 dark:hover:bg-rose-950"
          >
            🗑️
          </button>
        </div>
      </div>

      {note.content && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
          {note.content}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            #{tag}
          </span>
        ))}
        <span className="ml-auto">{formatDate(note.updatedAt)}</span>
      </div>

      {interviewing && (
        <InterviewModal
          noteId={note.id}
          title={note.title}
          content={note.content}
          onClose={() => setInterviewing(false)}
        />
      )}
    </article>
  );
}
