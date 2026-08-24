import { createHash, randomBytes } from "node:crypto";

/**
 * Same hash-at-rest pattern as session tokens (src/lib/session.ts): the raw
 * token is shown to the customer once, at checkout, and never stored — only
 * its hash is persisted, so a database read alone can't grant tracking access.
 */
export function generateTrackingToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashTrackingToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
