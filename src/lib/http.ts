import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function jsonError(status: number, code: string, message: string, headers?: HeadersInit) {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(400, "VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", "));
  }
  if (error instanceof ValidationError) {
    return jsonError(400, "VALIDATION_ERROR", error.message);
  }
  if (error instanceof UnauthorizedError) {
    return jsonError(401, "UNAUTHORIZED", error.message);
  }
  if (error instanceof ForbiddenError) {
    return jsonError(403, "FORBIDDEN", error.message);
  }
  if (error instanceof NotFoundError) {
    return jsonError(404, "NOT_FOUND", error.message);
  }
  if (error instanceof ConflictError) {
    return jsonError(409, "CONFLICT", error.message);
  }
  if (error instanceof RateLimitError) {
    const retryAfterSeconds = Math.ceil(error.retryAfterMs / 1000);
    return jsonError(429, "RATE_LIMITED", error.message, { "Retry-After": String(retryAfterSeconds) });
  }

  logger.error("Unhandled route error", {
    error: error instanceof Error ? error.message : String(error),
  });
  return jsonError(500, "INTERNAL_ERROR", "Something went wrong");
}
