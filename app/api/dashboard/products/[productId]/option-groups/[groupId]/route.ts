import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";
import { updateOptionGroupSchema } from "@/src/modules/products/products.validation";

interface RouteParams {
  params: Promise<{ productId: string; groupId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { groupId } = await params;
    const body = await request.json();
    const input = updateOptionGroupSchema.parse(body);
    const group = await productsService.updateOptionGroup(ctx, groupId, input);
    return jsonSuccess(group);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { groupId } = await params;
    await productsService.deleteOptionGroup(ctx, groupId);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
