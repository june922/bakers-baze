import type { NextRequest } from "next/server";
import { RateLimitError, ValidationError } from "@/src/lib/errors";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { checkRateLimit } from "@/src/lib/rate-limit";
import { resolveTenantBySlug } from "@/src/lib/tenant-context";
import { ordersService } from "@/src/modules/orders/orders.service";
import { checkoutSchema } from "@/src/modules/orders/orders.validation";

const CHECKOUT_RATE_LIMIT = { limit: 10, windowMs: 10 * 60_000 };

interface RouteParams {
  params: Promise<{ bakerySlug: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = request.headers.get("x-forwarded-for");
    if (ip) {
      const result = await checkRateLimit({ key: `checkout:ip:${ip}`, ...CHECKOUT_RATE_LIMIT });
      if (!result.allowed) {
        throw new RateLimitError(result.retryAfterMs, "Too many checkout attempts. Try again later.");
      }
    }

    const { bakerySlug } = await params;
    const bakery = await resolveTenantBySlug(bakerySlug);
    if (!bakery || bakery.status === "suspended") {
      throw new ValidationError("This storefront is not available");
    }

    const body = await request.json();
    const input = checkoutSchema.parse(body);

    const result = await ordersService.checkout(bakery.id, {
      items: input.items,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail ?? null,
      fulfilmentMethod: input.fulfilmentMethod,
      requestedFor: input.requestedFor,
      deliveryAddress: input.deliveryAddress ?? null,
    });

    return jsonSuccess(result, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
