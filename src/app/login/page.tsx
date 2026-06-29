"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8"
      >
        <h1 className="text-2xl font-bold tracking-tight text-white">Wisdom</h1>
        <p className="mt-1 text-sm text-neutral-500">Vul je wachtwoord in.</p>

        <input
          type="password"
          autoFocus
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-6 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-white outline-none focus:border-neutral-500 transition"
        />

        {error && (
          <p className="mt-2 text-sm text-rose-500">Verkeerd wachtwoord.</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-30 transition"
        >
          {loading ? "Even wachten…" : "Inloggen"}
        </button>
      </form>
    </main>
  );
}
