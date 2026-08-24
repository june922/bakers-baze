import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { toTenantContext } from "@/src/lib/tenant-context";
import { requireBaker } from "@/src/modules/auth/auth.service";
import { storefrontService } from "@/src/modules/storefront/storefront.service";
import { updateStorefrontSettingsSchema } from "@/src/modules/storefront/storefront.validation";

export async function GET() {
  try {
    const ctx = toTenantContext(await requireBaker());
    const settings = await storefrontService.getSettings(ctx);
    return jsonSuccess(settings);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = toTenantContext(await requireBaker());
    await verifyCsrf(request);
    const body = await request.json();
    const input = updateStorefrontSettingsSchema.parse(body);
    const settings = await storefrontService.updateSettings(ctx, input);
    return jsonSuccess(settings);
  } catch (error) {
    return handleRouteError(error);
  }
}
