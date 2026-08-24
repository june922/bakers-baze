"use client";

import { useRouter } from "next/navigation";

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export default function LogoutButton({ action, redirectTo }: { action: string; redirectTo: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch(action, {
      method: "POST",
      headers: { "x-csrf-token": readCookie("csrf_token") },
    });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
    >
      Sign out
    </button>
  );
}
