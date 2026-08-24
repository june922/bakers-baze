import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";
import { updateOptionValueSchema } from "@/src/modules/products/products.validation";

interface RouteParams {
  params: Promise<{ productId: string; groupId: string; valueId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { valueId } = await params;
    const body = await request.json();
    const input = updateOptionValueSchema.parse(body);
    const value = await productsService.updateOptionValue(ctx, valueId, input);
    return jsonSuccess(value);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { valueId } = await params;
    await productsService.deleteOptionValue(ctx, valueId);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
