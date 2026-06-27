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
        placeholder="Zoeken in titel, tekst, tags…"
        onChange={(e) => {
          const v = e.target.value.trim();
          if (searchTimer.current) clearTimeout(searchTimer.current);
          searchTimer.current = setTimeout(() => setParam("q", v || null), 250);
        }}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => setParam("type", null)}
          className={`rounded-full px-3 py-1 transition ${
            !activeType
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
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
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {TYPE_META[t].emoji} {TYPE_META[t].label}
            {countByType[t] ? (
              <span className="ml-1 opacity-60">{countByType[t]}</span>
            ) : null}
          </button>
        ))}

        <button
          onClick={() => setParam("view", showArchived ? null : "archief")}
          className={`ml-auto rounded-full px-3 py-1 transition ${
            showArchived
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
          }`}
        >
          {showArchived ? "← Terug" : "Archief"}
        </button>
      </div>
    </div>
  );
}
