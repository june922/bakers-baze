import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { productsService } from "@/src/modules/products/products.service";
import { createOptionValueSchema } from "@/src/modules/products/products.validation";

interface RouteParams {
  params: Promise<{ productId: string; groupId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const { groupId } = await params;
    const body = await request.json();
    const input = createOptionValueSchema.parse(body);
    const value = await productsService.createOptionValue(ctx, groupId, input);
    return jsonSuccess(value, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
