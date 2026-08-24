import { cookies } from "next/headers";
import { ForbiddenError } from "./errors";
import { CSRF_COOKIE_NAME } from "./session";

const CSRF_HEADER_NAME = "x-csrf-token";

export async function verifyCsrf(request: Request): Promise<void> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ForbiddenError("Invalid or missing CSRF token");
  }
}
