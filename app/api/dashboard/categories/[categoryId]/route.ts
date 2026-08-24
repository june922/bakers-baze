import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";
import { updateCategorySchema } from "@/src/modules/products/products.validation";

interface RouteParams {
  params: Promise<{ categoryId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { categoryId } = await params;
    const body = await request.json();
    const input = updateCategorySchema.parse(body);
    const category = await productsService.updateCategory(ctx, categoryId, input);
    return jsonSuccess(category);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { categoryId } = await params;
    await productsService.deleteCategory(ctx, categoryId);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
