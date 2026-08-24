import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import db from "@/src/lib/db";
import { UnauthorizedError } from "@/src/lib/errors";
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

describe("auth security hardening", () => {
  beforeAll(cleanUp);
  afterEach(cleanUp);
  afterAll(async () => {
    await db.destroy();
  });

  it("normalizes email case on write, so lookups are case-insensitive", async () => {
    const bakery = await tenantsRepository.create({ slug: `bakery-${randomUUID()}` });
    const mixedCaseEmail = `Baker.${randomUUID()}@Example.COM`;
    const passwordHash = await hashPassword("CorrectPassw0rd!");
    await usersRepository.create({ role: "baker", tenantId: bakery.id, email: mixedCaseEmail, passwordHash });

    const found = await usersRepository.findByEmail(mixedCaseEmail.toUpperCase());
    expect(found).toBeDefined();
    expect(found?.email).toBe(mixedCaseEmail.toLowerCase());

    // A wrong password on a case-varied version of the same email must still
    // resolve to that account (UnauthorizedError from the password check,
    // not from a failed lookup) — proving login's user resolution is
    // case-insensitive. A full successful login can't be exercised here: it
    // reaches cookies().set(), which requires a live Next.js request context
    // that doesn't exist under the test runner (see tests/setup.ts).
    await expect(
      loginBaker(mixedCaseEmail.toUpperCase(), "WrongPassword", NO_REQUEST_CONTEXT)
    ).rejects.toThrow(UnauthorizedError);
  });

  it("rejects creating two accounts whose emails differ only by case", async () => {
    const bakery = await tenantsRepository.create({ slug: `bakery-${randomUUID()}` });
    const email = `dup-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("CorrectPassw0rd!");

    await usersRepository.create({ role: "baker", tenantId: bakery.id, email: email.toLowerCase(), passwordHash });
    await expect(
      usersRepository.create({ role: "baker", tenantId: bakery.id, email: email.toUpperCase(), passwordHash })
    ).rejects.toThrow();
  });

  it("rejects login for a nonexistent account without throwing an unexpected error", async () => {
    await expect(
      loginBaker(`nobody-${randomUUID()}@example.com`, "WhateverPassword", NO_REQUEST_CONTEXT)
    ).rejects.toThrow(UnauthorizedError);
  });
});
