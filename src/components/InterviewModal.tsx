"use client";

import { useState } from "react";
import { enrichNote } from "@/lib/actions";
import type { InterviewMessage, InterviewResponse } from "@/app/api/interview/route";

type Props = {
  noteId: string;
  title: string;
  content: string;
  onClose: () => void;
};

export function InterviewModal({ noteId, title, content, onClose }: Props) {
  const [history, setHistory] = useState<InterviewMessage[]>([]);
  const [current, setCurrent] = useState<{
    text: string;
    choices?: string[];
  } | null>(null);
  const [openAnswer, setOpenAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{
    enrichedTitle: string;
    enrichedContent: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [started, setStarted] = useState(false);

  async function ask(nextHistory: InterviewMessage[]) {
    setLoading(true);
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId, title, content, history: nextHistory }),
    });
    const data: InterviewResponse = await res.json();
    setLoading(false);

    if (data.status === "done") {
      setDone(data);
      setCurrent(null);
    } else {
      setCurrent({ text: data.text, choices: data.choices });
      setHistory(nextHistory);
    }
  }

  async function start() {
    setStarted(true);
    await ask([]);
  }

  async function answer(ans: string) {
    if (!current) return;
    const nextHistory: InterviewMessage[] = [
      ...history,
      { role: "assistant", type: "question", text: current.text, choices: current.choices },
      { role: "user", answer: ans },
    ];
    setOpenAnswer("");
    await ask(nextHistory);
  }

  async function saveEnriched() {
    if (!done) return;
    setSaving(true);
    await enrichNote(noteId, done.enrichedTitle, done.enrichedContent);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-500 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-white">💡 Interview-modus</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Ik stel een paar vragen om je idee scherper te maken.
        </p>

        <div className="mt-1 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300">
          <span className="font-medium">{title}</span>
          {content && (
            <p className="mt-0.5 text-neutral-500 line-clamp-2">{content}</p>
          )}
        </div>

        {/* Niet gestart */}
        {!started && (
          <button
            onClick={start}
            className="mt-6 w-full rounded-xl bg-amber-500 py-3 font-medium text-white hover:bg-amber-400"
          >
            Start interview
          </button>
        )}

        {/* Laden */}
        {loading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-neutral-400">
            <span className="animate-spin">⟳</span> Claude denkt na…
          </div>
        )}

        {/* Vraag */}
        {!loading && current && (
          <div className="mt-6 space-y-4">
            <p className="font-medium text-white">{current.text}</p>

            {current.choices ? (
              <div className="space-y-2">
                {current.choices.map((c) => (
                  <button
                    key={c}
                    onClick={() => answer(c)}
                    className="w-full rounded-xl border border-neutral-700 px-4 py-2.5 text-left text-sm text-neutral-200 hover:border-amber-500 hover:bg-amber-500/10 transition"
                  >
                    {c}
                  </button>
                ))}
                <button
                  onClick={() => answer("Anders / overslaan")}
                  className="text-xs text-neutral-500 hover:text-neutral-300"
                >
                  Overslaan →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={openAnswer}
                  onChange={(e) => setOpenAnswer(e.target.value)}
                  placeholder="Typ je antwoord…"
                  rows={3}
                  className="w-full resize-none rounded-xl bg-neutral-800 p-3 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => answer(openAnswer)}
                    disabled={!openAnswer.trim()}
                    className="flex-1 rounded-xl bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-40"
                  >
                    Verstuur
                  </button>
                  <button
                    onClick={() => answer("Overslaan")}
                    className="rounded-xl px-3 py-2 text-sm text-neutral-500 hover:text-white"
                  >
                    Overslaan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Klaar — toon verrijkt idee */}
        {done && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
              <p className="text-xs text-amber-400 mb-1">Verrijkt idee</p>
              <p className="font-semibold text-white">{done.enrichedTitle}</p>
              <p className="mt-2 text-sm text-neutral-300">{done.enrichedContent}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEnriched}
                disabled={saving}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50"
              >
                {saving ? "Opslaan…" : "✓ Sla op en vervang notitie"}
              </button>
              <button
                onClick={onClose}
                className="rounded-xl px-3 py-2.5 text-sm text-neutral-500 hover:text-white"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
