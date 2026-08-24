"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/src/lib/dashboard-api-client";
import type { Order } from "@/src/modules/orders/orders.types";

const CANCELLABLE_STATUSES = new Set([
  "requested",
  "confirmed",
  "awaiting_payment",
  "partially_paid",
  "paid",
  "preparing",
  "ready",
]);

export default function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declineNote, setDeclineNote] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  async function runAction(action: "confirm" | "decline" | "cancel", note?: string) {
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/dashboard/orders/${order.id}/${action}`, {
        method: "POST",
        body: action === "confirm" ? undefined : { note: note || null },
      });
      setShowDeclineForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const canCancel = CANCELLABLE_STATUSES.has(order.status);

  if (order.status !== "requested" && !canCancel) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {order.status === "requested" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction("confirm")}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowDeclineForm((v) => !v)}
              className="rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
            >
              Decline
            </button>
          </>
        )}
        {canCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Cancel this order? This cannot be undone.")) void runAction("cancel");
            }}
            className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 disabled:opacity-50 dark:border-red-900"
          >
            Cancel order
          </button>
        )}
      </div>

      {showDeclineForm && (
        <div className="flex flex-col gap-2">
          <label htmlFor="decline-note" className="text-sm font-medium">
            Note to the customer (optional)
          </label>
          <textarea
            id="decline-note"
            value={declineNote}
            onChange={(e) => setDeclineNote(e.target.value)}
            rows={2}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction("decline", declineNote)}
            className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            Confirm decline
          </button>
        </div>
      )}
    </div>
  );
}
