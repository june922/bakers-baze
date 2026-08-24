import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { ordersService } from "@/src/modules/orders/orders.service";
import { cancelOrderSchema } from "@/src/modules/orders/orders.validation";

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const input = cancelOrderSchema.parse(body);
    const order = await ordersService.cancelOrder(ctx, orderId, input.note ?? null);
    return jsonSuccess(order);
  } catch (error) {
    return handleRouteError(error);
  }
}
