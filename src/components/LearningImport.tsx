"use client";

import { useState } from "react";
import { importLearnings } from "@/lib/actions";

const EXAMPLE = `[
  {
    "title": "Rustige duurloop verlaagt rusthartslag",
    "insight": "Meer zone 2 verlaagt na 4 weken mijn rusthartslag met 4 bpm.",
    "evidence": "RUNALYZE: rusthartslag 52→48 in mei",
    "action": "80% van km's in zone 2 houden",
    "category": "Hardlopen",
    "tags": ["zone2", "hartslag", "uithoudingsvermogen"],
    "source": "RUNALYZE"
  }
]`;

export function LearningImport({ onDone }: { onDone?: () => void }) {
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    const result = await importLearnings(json);
    setBusy(false);
    if ("error" in result) {
      setMsg({ ok: false, text: result.error });
    } else {
      setMsg({ ok: true, text: `${result.imported} learning(s) geïmporteerd.` });
      setJson("");
      onDone?.();
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">JSON importeren</h3>
        <p className="mt-0.5 text-xs text-neutral-500">
          Plak een array met velden <code className="text-neutral-400">title, insight, evidence, action, category, tags</code>. Alleen <code className="text-neutral-400">title</code> is verplicht.
        </p>
      </div>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder={EXAMPLE}
        rows={10}
        className="w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-xs text-neutral-200 placeholder:text-neutral-700 outline-none focus:border-neutral-600 transition"
      />
      {msg && (
        <p className={`text-xs ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setJson(EXAMPLE)}
          className="rounded-xl px-4 py-2 text-sm text-neutral-500 hover:text-white transition"
        >
          Voorbeeld invullen
        </button>
        <button
          onClick={run}
          disabled={busy || !json.trim()}
          className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-40 transition"
        >
          {busy ? "Importeren…" : "Importeer"}
        </button>
      </div>
    </div>
  );
}
