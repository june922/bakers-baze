import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import db from "@/src/lib/db";
import { RateLimitError, UnauthorizedError } from "@/src/lib/errors";
import { hashPassword, loginBaker } from "@/src/modules/auth/auth.service";
import { usersRepository } from "@/src/modules/auth/auth.repository";
import { tenantsRepository } from "@/src/modules/tenants/tenants.repository";

const NO_REQUEST_CONTEXT = { userAgent: null, ip: null };

async function cleanUp(): Promise<void> {
  await db("rate_limit_hits").del();
  await db("sessions").del();
  await db("users").del();
  await db("bakeries").del();
}

describe("login rate limiting", () => {
  beforeAll(cleanUp);
  afterEach(cleanUp);
  afterAll(async () => {
    await db.destroy();
  });

  it("blocks further attempts for the same account after five failed logins within the window", async () => {
    const bakery = await tenantsRepository.create({ slug: `bakery-${randomUUID()}` });
    const email = `baker-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("CorrectPassw0rd!");
    await usersRepository.create({ role: "baker", tenantId: bakery.id, email, passwordHash });

    for (let i = 0; i < 5; i++) {
      await expect(loginBaker(email, "WrongPassword", NO_REQUEST_CONTEXT)).rejects.toThrow(UnauthorizedError);
    }

    // 6th attempt is blocked by the rate limiter — the limiter runs before
    // credential checks, so even a would-be-correct password is rejected.
    await expect(loginBaker(email, "WrongPassword", NO_REQUEST_CONTEXT)).rejects.toThrow(RateLimitError);
  });

  it("keeps a different account's bucket isolated from a rate-limited one", async () => {
    const bakery = await tenantsRepository.create({ slug: `bakery-${randomUUID()}` });
    const rateLimitedEmail = `baker-${randomUUID()}@example.com`;
    const otherEmail = `baker-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("CorrectPassw0rd!");
    await usersRepository.create({ role: "baker", tenantId: bakery.id, email: rateLimitedEmail, passwordHash });
    await usersRepository.create({ role: "baker", tenantId: bakery.id, email: otherEmail, passwordHash });

    for (let i = 0; i < 5; i++) {
      await expect(loginBaker(rateLimitedEmail, "WrongPassword", NO_REQUEST_CONTEXT)).rejects.toThrow(
        UnauthorizedError
      );
    }
    await expect(loginBaker(rateLimitedEmail, "WrongPassword", NO_REQUEST_CONTEXT)).rejects.toThrow(RateLimitError);

    // The other account's bucket is untouched: a wrong password on it still
    // fails on credentials (UnauthorizedError), not on the rate limiter.
    await expect(loginBaker(otherEmail, "WrongPassword", NO_REQUEST_CONTEXT)).rejects.toThrow(UnauthorizedError);
  });
});
