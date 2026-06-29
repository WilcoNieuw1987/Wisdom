"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-xl border border-neutral-800 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-600 hover:text-white transition"
    >
      Uitloggen
    </button>
  );
}
