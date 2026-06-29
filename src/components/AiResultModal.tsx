"use client";

import { enrichNote } from "@/lib/actions";
import { useState } from "react";

type AiMode = "actions" | "rewrite" | "insight" | "thread";

interface AiResult {
  mode: AiMode;
  actions?: string[];
  rewrite?: { title: string; content: string };
  insight?: string;
  thread?: string;
}

interface Props {
  noteId: string;
  result: AiResult;
  onClose: () => void;
}

const MODE_META: Record<AiMode, { icon: string; label: string; color: string }> = {
  actions: { icon: "⚡", label: "Actiepunten", color: "text-yellow-400" },
  rewrite: { icon: "🔄", label: "Herschreven", color: "text-green-400" },
  insight: { icon: "💡", label: "Inzicht",     color: "text-purple-400" },
  thread:  { icon: "🧵", label: "Rode draad",  color: "text-rose-300"   },
};

export function AiResultModal({ noteId, result, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const meta = MODE_META[result.mode];

  async function saveRewrite() {
    if (!result.rewrite) return;
    setSaving(true);
    await enrichNote(noteId, result.rewrite.title, result.rewrite.content);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl border-t border-neutral-700 bg-neutral-900 p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{meta.icon}</span>
          <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
        </div>

        {/* Actiepunten */}
        {result.mode === "actions" && result.actions && (
          <ul className="space-y-2">
            {result.actions.map((action, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-neutral-800 px-3 py-2.5">
                <span className="mt-0.5 shrink-0 text-xs font-bold text-yellow-400">{i + 1}</span>
                <span className="text-sm text-neutral-200">{action}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Herschreven */}
        {result.mode === "rewrite" && result.rewrite && (
          <div className="space-y-3">
            <div className="rounded-xl bg-neutral-800 p-4">
              <p className="text-xs text-neutral-500 mb-1">Nieuwe titel</p>
              <p className="text-sm font-semibold text-white">{result.rewrite.title}</p>
            </div>
            <div className="rounded-xl bg-neutral-800 p-4">
              <p className="text-xs text-neutral-500 mb-1">Herschreven inhoud</p>
              <p className="text-sm text-neutral-300 leading-relaxed">{result.rewrite.content}</p>
            </div>
            <button
              onClick={saveRewrite}
              disabled={saving}
              className="mt-2 w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition"
            >
              {saving ? "Opslaan…" : "✓ Opslaan en vervangen"}
            </button>
          </div>
        )}

        {/* Inzicht */}
        {result.mode === "insight" && result.insight && (
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
            <p className="text-sm text-neutral-200 leading-relaxed italic">"{result.insight}"</p>
          </div>
        )}

        {/* Rode draad */}
        {result.mode === "thread" && result.thread && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-5">
            <p className="text-sm text-neutral-200 leading-relaxed">{result.thread}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-neutral-700 py-2 text-sm text-neutral-500 hover:text-white transition"
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}
