"use client";

import { useRef, useState } from "react";
import { createNote } from "@/lib/actions";

export function NoteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  function insertText(text: string) {
    setValue((prev) => (prev ? prev + "\n\n" + text : text));
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = Array.from(e.dataTransfer.files).find(
      (f) => f.type.startsWith("text/") || f.name.endsWith(".md") || f.name.endsWith(".txt")
    );
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => insertText(((ev.target?.result as string) ?? "").trim());
      reader.readAsText(file);
      return;
    }
    const text = e.dataTransfer.getData("text/plain");
    if (text.trim()) insertText(text.trim());
  }

  async function submit() {
    if (!value.trim() || saving) return;
    setSaving(true);
    const fd = new FormData();
    fd.set("raw", value);
    await createNote(fd);
    setValue("");
    setSaving(false);
    textareaRef.current?.focus();
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      <div className={`flex rounded-2xl border bg-neutral-900 transition-all ${dragging ? "border-amber-500 shadow-amber-500/20 shadow-lg" : "border-neutral-800 focus-within:border-neutral-600"}`}>
        <textarea
          ref={textareaRef}
          name="raw"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); submit(); }
          }}
          placeholder={dragging ? "Laat los om in te voegen…" : "Wat zit er in je hoofd? (Ctrl+Enter om op te slaan)"}
          rows={3}
          className="flex-1 resize-none bg-transparent px-4 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none"
        />
        <div className="flex flex-col justify-between p-2">
          <span className="text-[10px] text-neutral-700 text-right px-1 pt-1">✦ AI</span>
          <button
            type="submit"
            disabled={!value.trim() || saving}
            className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-25 transition"
          >
            {saving ? "…" : "↵"}
          </button>
        </div>
      </div>
    </form>
  );
}
