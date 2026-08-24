import type { NextRequest } from "next/server";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { ordersService } from "@/src/modules/orders/orders.service";

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    const { orderId } = await params;
    const order = await ordersService.getOrder(ctx, orderId);
    return jsonSuccess(order);
  } catch (error) {
    return handleRouteError(error);
  }
}
