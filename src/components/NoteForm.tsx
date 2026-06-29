"use client";

import { useRef, useState } from "react";
import { createNote } from "@/lib/actions";

export function NoteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setSaving(true);
        await createNote(fd);
        setValue("");
        setSaving(false);
        setFocused(false);
        formRef.current?.reset();
      }}
      className="relative"
    >
      <textarea
        name="raw"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="Wat zit er in je hoofd?"
        rows={focused ? 5 : 2}
        className={`w-full resize-none rounded-2xl border bg-neutral-900 px-5 py-4 text-white placeholder:text-neutral-600 outline-none transition-all duration-200 ${
          focused
            ? "border-neutral-600 shadow-lg shadow-black/40"
            : "border-neutral-800"
        }`}
      />

      {(focused || value) && (
        <div className="mt-2 flex items-center justify-between px-1">
          <p className="text-xs text-neutral-600">
            ✦ AI detecteert type · genereert titel · koppelt aan thema's
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setValue("");
                setFocused(false);
                formRef.current?.reset();
              }}
              className="rounded-xl px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition"
            >
              Annuleer
            </button>
            <button
              type="submit"
              disabled={!value.trim() || saving}
              className="rounded-xl bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-30 transition"
            >
              {saving ? "Verwerken…" : "Opslaan ↵"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
