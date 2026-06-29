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
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <h1 className="text-2xl font-bold tracking-tight">Wisdom</h1>
        <p className="mt-1 text-sm text-neutral-500">Vul je wachtwoord in.</p>

        <input
          type="password"
          autoFocus
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-6 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-800"
        />

        {error && (
          <p className="mt-2 text-sm text-rose-500">Verkeerd wachtwoord.</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {loading ? "Even wachten…" : "Inloggen"}
        </button>
      </form>
    </main>
  );
}
