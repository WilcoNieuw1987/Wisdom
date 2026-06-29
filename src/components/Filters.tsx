"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TYPE_META, type NoteType } from "@/lib/types";

export function Filters({
  activeType,
  q,
  showArchived,
  countByType,
}: {
  activeType?: NoteType;
  q: string;
  showArchived: boolean;
  countByType: Record<string, number>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/?${next.toString()}`);
  }

  const types = Object.keys(TYPE_META) as NoteType[];

  return (
    <div className="mt-6 space-y-3">
      <input
        defaultValue={q}
        placeholder="Zoeken…"
        onChange={(e) => {
          const v = e.target.value.trim();
          if (searchTimer.current) clearTimeout(searchTimer.current);
          searchTimer.current = setTimeout(() => setParam("q", v || null), 250);
        }}
        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-neutral-600 transition"
      />

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          onClick={() => setParam("type", null)}
          className={`rounded-full px-3 py-1 transition ${
            !activeType
              ? "bg-white text-black font-semibold"
              : "text-neutral-500 hover:text-white"
          }`}
        >
          Alles
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setParam("type", activeType === t ? null : t)}
            className={`rounded-full px-3 py-1 transition ${
              activeType === t
                ? "bg-white text-black font-semibold"
                : "text-neutral-500 hover:text-white"
            }`}
          >
            {TYPE_META[t].emoji} {TYPE_META[t].label}
            {countByType[t] ? (
              <span className="ml-1 opacity-50">{countByType[t]}</span>
            ) : null}
          </button>
        ))}
        <button
          onClick={() => setParam("view", showArchived ? null : "archief")}
          className={`ml-auto rounded-full px-3 py-1 transition ${
            showArchived
              ? "bg-white text-black font-semibold"
              : "text-neutral-500 hover:text-white"
          }`}
        >
          {showArchived ? "← Terug" : "Archief"}
        </button>
      </div>
    </div>
  );
}
