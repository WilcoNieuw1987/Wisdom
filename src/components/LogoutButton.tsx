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
      className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
    >
      Uitloggen
    </button>
  );
}
