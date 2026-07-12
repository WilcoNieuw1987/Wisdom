"use client";

import { useState } from "react";
import { createLearning, updateLearning } from "@/lib/actions";
import { LEARNING_CATEGORIES, parseTags, type Learning } from "@/lib/learnings";

type Props = {
  learning?: Learning; // aanwezig = bewerken
  onDone?: () => void;
};

function toDateInput(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function LearningForm({ learning, onDone }: Props) {
  const editing = !!learning;
  const [tags, setTags] = useState<string[]>(learning ? parseTags(learning.tags) : []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  function addTag(raw: string) {
    const t = raw.trim().replace(/,$/, "");
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }
  function onTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  return (
    <form
      action={async (fd) => {
        setSaving(true);
        fd.set("tags", tags.join(", "));
        if (editing) await updateLearning(learning.id, fd);
        else await createLearning(fd);
        setSaving(false);
        setTags([]);
        setTagInput("");
        onDone?.();
      }}
      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3"
    >
      <input
        name="title"
        defaultValue={learning?.title}
        required
        placeholder="Titel — wat heb je geleerd?"
        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white placeholder:text-neutral-600 outline-none focus:border-neutral-600 transition"
      />

      <textarea
        name="insight"
        defaultValue={learning?.insight}
        placeholder="Het inzicht — de kern in je eigen woorden"
        rows={3}
        className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-neutral-600 transition"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <textarea
          name="evidence"
          defaultValue={learning?.evidence ?? ""}
          placeholder="Bewijs / onderbouwing (optioneel)"
          rows={2}
          className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-300 placeholder:text-neutral-600 outline-none focus:border-neutral-600 transition"
        />
        <textarea
          name="action"
          defaultValue={learning?.action ?? ""}
          placeholder="Vervolgactie (optioneel)"
          rows={2}
          className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-300 placeholder:text-neutral-600 outline-none focus:border-neutral-600 transition"
        />
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
            #{t}
            <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="text-neutral-500 hover:text-white">×</button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={onTagKey}
          onBlur={() => tagInput && addTag(tagInput)}
          placeholder={tags.length ? "" : "Tags — Enter of komma"}
          className="flex-1 min-w-[120px] bg-transparent px-1 py-1 text-sm text-white placeholder:text-neutral-600 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          name="category"
          defaultValue={learning?.category ?? "Hardlopen"}
          className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600 transition"
        >
          {LEARNING_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          name="source"
          defaultValue={learning?.source ?? ""}
          placeholder="Bron (bv. RUNALYZE)"
          className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-300 placeholder:text-neutral-600 outline-none focus:border-neutral-600 transition"
        />
        <input
          type="date"
          name="date"
          defaultValue={learning ? toDateInput(learning.date) : toDateInput(new Date())}
          className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-300 outline-none focus:border-neutral-600 transition [color-scheme:dark]"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onDone && (
          <button type="button" onClick={onDone} className="rounded-xl px-4 py-2 text-sm text-neutral-500 hover:text-white transition">
            Annuleer
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-40 transition"
        >
          {saving ? "Opslaan…" : editing ? "Bijwerken" : "Learning opslaan"}
        </button>
      </div>
    </form>
  );
}
