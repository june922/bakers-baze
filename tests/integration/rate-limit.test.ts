import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import db from "@/src/lib/db";
import { checkRateLimit } from "@/src/lib/rate-limit";

describe("checkRateLimit", () => {
  afterAll(async () => {
    await db.destroy();
  });

  it("allows requests up to the limit and blocks the next one", async () => {
    const key = `test:${randomUUID()}`;

    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit({ key, limit: 3, windowMs: 60_000 });
      expect(result.allowed).toBe(true);
    }

    const blocked = await checkRateLimit({ key, limit: 3, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("keeps separate buckets isolated by key", async () => {
    const keyA = `test:${randomUUID()}`;
    const keyB = `test:${randomUUID()}`;

    for (let i = 0; i < 2; i++) {
      await checkRateLimit({ key: keyA, limit: 2, windowMs: 60_000 });
    }

    const blockedA = await checkRateLimit({ key: keyA, limit: 2, windowMs: 60_000 });
    const allowedB = await checkRateLimit({ key: keyB, limit: 2, windowMs: 60_000 });

    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });

  it("allows requests again once the window has fully elapsed", async () => {
    const key = `test:${randomUUID()}`;

    const first = await checkRateLimit({ key, limit: 1, windowMs: 50 });
    expect(first.allowed).toBe(true);

    const immediatelyAfter = await checkRateLimit({ key, limit: 1, windowMs: 50 });
    expect(immediatelyAfter.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 60));

    const afterWindow = await checkRateLimit({ key, limit: 1, windowMs: 50 });
    expect(afterWindow.allowed).toBe(true);
  });
});
