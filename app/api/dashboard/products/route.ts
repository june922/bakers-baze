import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";
import { createProductSchema } from "@/src/modules/products/products.validation";

export async function GET() {
  try {
    const ctx = toTenantContext(await requireBaker());
    const products = await productsService.listProducts(ctx);
    return jsonSuccess(products);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const body = await request.json();
    const input = createProductSchema.parse(body);
    const product = await productsService.createProduct(ctx, input);
    return jsonSuccess(product, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
