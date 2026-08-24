import type { NextRequest } from "next/server";
import { ValidationError } from "@/src/lib/errors";
import { handleRouteError, jsonSuccess } from "@/src/lib/http";
import { loginBaker } from "@/src/modules/auth/auth.service";
import { loginSchema } from "@/src/modules/auth/auth.validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const user = await loginBaker(parsed.data.email, parsed.data.password, {
      userAgent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for"),
    });
    return jsonSuccess({ userId: user.userId, email: user.email, role: user.role });
  } catch (error) {
    return handleRouteError(error);
  }
}
