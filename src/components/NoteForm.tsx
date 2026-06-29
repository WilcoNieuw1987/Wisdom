"use client";

import { useRef, useState } from "react";
import { createNote } from "@/lib/actions";

export function NoteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  function insertText(text: string) {
    setValue((prev) => (prev ? prev + "\n\n" + text : text));
    setFocused(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear when leaving the form entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const textFile = files.find(
      (f) =>
        f.type.startsWith("text/") ||
        f.name.endsWith(".md") ||
        f.name.endsWith(".txt")
    );

    if (textFile) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = (ev.target?.result as string) ?? "";
        if (text.trim()) insertText(text.trim());
      };
      reader.readAsText(textFile);
      return;
    }

    const text = e.dataTransfer.getData("text/plain");
    if (text.trim()) insertText(text.trim());
  }

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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="relative">
        <textarea
          ref={textareaRef}
          name="raw"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={dragging ? "Laat los om in te voegen…" : "Wat zit er in je hoofd?"}
          rows={focused || dragging ? 5 : 2}
          className={`w-full resize-none rounded-2xl border bg-neutral-900 px-5 py-4 text-white placeholder:text-neutral-600 outline-none transition-all duration-200 ${
            dragging
              ? "border-amber-500 shadow-lg shadow-amber-500/20"
              : focused
              ? "border-neutral-600 shadow-lg shadow-black/40"
              : "border-neutral-800"
          }`}
        />
        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl">
            <span className="text-xs text-amber-400">↓ Sleep tekst of bestand hier naartoe</span>
          </div>
        )}
      </div>

      {(focused || value) && !dragging && (
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
