import { notFound } from "next/navigation";
import OrderActions from "@/src/components/dashboard/OrderActions";
import { NotFoundError } from "@/src/lib/errors";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { ordersService } from "@/src/modules/orders/orders.service";
import { formatPrice } from "@/src/templates/format";

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const ctx = toTenantContext(await requireBaker());

  let order;
  try {
    order = await ordersService.getOrder(ctx, orderId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const outstanding = order.amountDue - order.amountPaid;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{formatStatus(order.status)}</p>
      </div>

      <OrderActions order={order} />

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
              <span>{formatPrice(item.unitPriceSnapshot * item.quantity)}</span>
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
        <p className="font-medium">{order.fulfilmentMethod === "pickup" ? "Pickup" : "Delivery"} requested for</p>
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
              {formatStatus(entry.toStatus)} ({entry.actorType}) —{" "}
              {new Date(entry.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
              {entry.note && <span className="block italic">&quot;{entry.note}&quot;</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
