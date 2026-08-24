import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";
import { createOptionGroupSchema } from "@/src/modules/products/products.validation";

interface RouteParams {
  params: Promise<{ productId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { productId } = await params;
    const body = await request.json();
    const input = createOptionGroupSchema.parse(body);
    const group = await productsService.createOptionGroup(ctx, productId, input);
    return jsonSuccess(group, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
