import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";
import { createCategorySchema } from "@/src/modules/products/products.validation";

export async function GET() {
  try {
    const ctx = toTenantContext(await requireBaker());
    const categories = await productsService.listCategories(ctx);
    return jsonSuccess(categories);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const body = await request.json();
    const input = createCategorySchema.parse(body);
    const category = await productsService.createCategory(ctx, input);
    return jsonSuccess(category, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
