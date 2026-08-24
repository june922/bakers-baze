import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { ordersService } from "@/src/modules/orders/orders.service";

export async function GET() {
  try {
    const ctx = toTenantContext(await requireBaker());
    const orders = await ordersService.listOrders(ctx);
    return jsonSuccess(orders);
  } catch (error) {
    return handleRouteError(error);
  }
}
