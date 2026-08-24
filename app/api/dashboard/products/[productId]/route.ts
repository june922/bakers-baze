import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";
import { updateProductSchema } from "@/src/modules/products/products.validation";

interface RouteParams {
  params: Promise<{ productId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    const { productId } = await params;
    const product = await productsService.getProduct(ctx, productId);
    return jsonSuccess(product);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { productId } = await params;
    const body = await request.json();
    const input = updateProductSchema.parse(body);
    const product = await productsService.updateProduct(ctx, productId, input);
    return jsonSuccess(product);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { productId } = await params;
    await productsService.deleteProduct(ctx, productId);
    return jsonSuccess({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
