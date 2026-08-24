import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/src/lib/csrf";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { logout, requireAdmin } from "@/src/modules/auth/auth.service";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await verifyCsrf(request);
    await logout();
    return jsonSuccess({ loggedOut: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
