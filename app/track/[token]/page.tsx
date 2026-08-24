import { headers } from "next/headers";
import { checkRateLimit } from "@/src/lib/rate-limit";
import { ordersService } from "@/src/modules/orders/orders.service";
import { formatPrice } from "@/src/templates/format";

// Never cached: order status must always reflect the latest write, and a
// cached "declined"/"cancelled" would actively mislead the customer.
export const dynamic = "force-dynamic";

const TRACKING_RATE_LIMIT = { limit: 20, windowMs: 5 * 60_000 };

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for");

  if (ip) {
    const result = await checkRateLimit({ key: `tracking:ip:${ip}`, ...TRACKING_RATE_LIMIT });
    if (!result.allowed) {
      return (
        <main className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
          <h1 className="text-2xl font-semibold">Too many requests</h1>
          <p className="text-zinc-600 dark:text-zinc-400">Please wait a few minutes and try again.</p>
        </main>
      );
    }
  }

  const order = await ordersService.getByTrackingToken(token);

  if (!order) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
        <h1 className="text-2xl font-semibold">Order not found</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          This tracking link is invalid or the order no longer exists.
        </p>
      </main>
    );
  }

  const latestDecline = [...order.history].reverse().find((entry) => entry.toStatus === "declined");
  const outstanding = order.amountDue - order.amountPaid;

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Order {order.orderNumber}</h1>
        <p className="mt-1 text-lg">{formatStatus(order.status)}</p>
      </div>

      {latestDecline?.note && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">Note from the baker:</p>
          <p>{latestDecline.note}</p>
        </div>
      )}

      <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <p className="mb-2 text-sm font-medium">Items</p>
        <ul className="flex flex-col gap-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.quantity} × {item.productNameSnapshot}
                {item.customizations.length > 0 && (
                  <span className="block text-zinc-500">
                    {item.customizations.map((c) => c.optionValueLabel).join(", ")}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-1 border-t border-black/[.08] pt-3 text-sm dark:border-white/[.145]">
          <div className="flex justify-between">
            <span>Amount due</span>
            <span>{formatPrice(order.amountDue)}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount paid</span>
            <span>{formatPrice(order.amountPaid)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Outstanding balance</span>
            <span>{formatPrice(outstanding)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-black/[.08] p-4 text-sm dark:border-white/[.145]">
        <p className="font-medium">
          {order.fulfilmentMethod === "pickup" ? "Pickup" : "Delivery"} requested for
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          {new Date(order.requestedFor).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
        </p>
        {order.deliveryAddress && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{order.deliveryAddress}</p>}
      </div>

      <div className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <p className="mb-2 text-sm font-medium">History</p>
        <ul className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          {order.history.map((entry) => (
            <li key={entry.id}>
              {formatStatus(entry.toStatus)} —{" "}
              {new Date(entry.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
