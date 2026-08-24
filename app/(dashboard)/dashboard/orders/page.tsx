import Link from "next/link";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { ordersService } from "@/src/modules/orders/orders.service";
import { formatPrice } from "@/src/templates/format";

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default async function OrdersPage() {
  const ctx = toTenantContext(await requireBaker());
  const orders = await ordersService.listOrders(ctx);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-zinc-500">No orders yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/dashboard/orders/${order.id}`}
                className="flex flex-col gap-1 rounded-lg border border-black/[.08] p-4 hover:bg-black/[.02] sm:flex-row sm:items-center sm:justify-between dark:border-white/[.145] dark:hover:bg-white/[.03]"
              >
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-zinc-500">
                    {formatStatus(order.status)} · {order.fulfilmentMethod}
                  </p>
                </div>
                <p className="font-medium">{formatPrice(order.amountDue)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
