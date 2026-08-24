"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/src/lib/dashboard-api-client";

export default function DeleteEntityButton({
  action,
  confirmMessage,
  redirectTo,
  label = "Delete",
}: {
  action: string;
  confirmMessage: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return;
    setDeleting(true);
    setError(null);
    try {
      await apiRequest(action, { method: "DELETE" });
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-900"
      >
        {deleting ? "Deleting…" : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
