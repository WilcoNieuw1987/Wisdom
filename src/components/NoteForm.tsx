"use client";

import { useRef, useState } from "react";
import { createNote } from "@/lib/actions";
import { TYPE_META, type NoteType } from "@/lib/types";

export function NoteForm({ types }: { types: NoteType[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<NoteType>("idee");
  const [open, setOpen] = useState(false);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createNote(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              type === t
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            }`}
          >
            {TYPE_META[t].emoji} {TYPE_META[t].label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <input
        name="title"
        placeholder={
          type === "frustratie"
            ? "Wat zit je dwars?"
            : type === "idee"
              ? "Wat is je idee?"
              : "Titel"
        }
        onFocus={() => setOpen(true)}
        className="mt-3 w-full bg-transparent text-lg font-medium outline-none placeholder:text-neutral-400"
      />

      {open && (
        <>
          <textarea
            name="content"
            rows={4}
            placeholder="Schrijf het van je af…"
            className="mt-2 w-full resize-y rounded-lg bg-neutral-50 p-3 text-sm outline-none placeholder:text-neutral-400 dark:bg-neutral-800"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              name="category"
              placeholder="Categorie (bijv. project X)"
              className="flex-1 rounded-lg bg-neutral-50 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 dark:bg-neutral-800"
            />
            <input
              name="tags"
              placeholder="Tags, komma-gescheiden"
              className="flex-1 rounded-lg bg-neutral-50 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 dark:bg-neutral-800"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                formRef.current?.reset();
                setOpen(false);
              }}
              className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Opslaan
            </button>
          </div>
        </>
      )}
    </form>
  );
}
