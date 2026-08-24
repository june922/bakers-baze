import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import db from "@/src/lib/db";
import { sessionsRepository, usersRepository } from "@/src/modules/auth/auth.repository";
import { hashPassword } from "@/src/modules/auth/auth.service";
import { tenantsRepository } from "@/src/modules/tenants/tenants.repository";

async function cleanUp(): Promise<void> {
  await db("sessions").del();
  await db("users").del();
  await db("bakeries").del();
}

async function seedBaker(tenantId: string) {
  const passwordHash = await hashPassword("Sup3rSecret!");
  return usersRepository.create({
    role: "baker",
    tenantId,
    email: `baker-${randomUUID()}@example.com`,
    passwordHash,
  });
}

describe("tenant isolation (bakeries, users, sessions)", () => {
  beforeAll(cleanUp);
  afterEach(cleanUp);
  afterAll(async () => {
    await db.destroy();
  });

  it("prevents reading another tenant's user via findByIdForTenant", async () => {
    const tenantA = await tenantsRepository.create({ slug: `tenant-a-${randomUUID()}` });
    const tenantB = await tenantsRepository.create({ slug: `tenant-b-${randomUUID()}` });

    const userA = await seedBaker(tenantA.id);
    const userB = await seedBaker(tenantB.id);

    await expect(usersRepository.findByIdForTenant(tenantA.id, userA.id)).resolves.toMatchObject({
      id: userA.id,
    });
    await expect(usersRepository.findByIdForTenant(tenantA.id, userB.id)).resolves.toBeUndefined();
    await expect(usersRepository.findByIdForTenant(tenantB.id, userA.id)).resolves.toBeUndefined();
  });

  it("prevents reading another tenant's session via findByIdForTenant", async () => {
    const tenantA = await tenantsRepository.create({ slug: `tenant-a-${randomUUID()}` });
    const tenantB = await tenantsRepository.create({ slug: `tenant-b-${randomUUID()}` });

    const userA = await seedBaker(tenantA.id);
    const sessionA = await sessionsRepository.create({
      id: randomUUID(),
      userId: userA.id,
      tenantId: tenantA.id,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(sessionsRepository.findByIdForTenant(tenantA.id, sessionA.id)).resolves.toMatchObject({
      id: sessionA.id,
    });
    await expect(sessionsRepository.findByIdForTenant(tenantB.id, sessionA.id)).resolves.toBeUndefined();
  });

  it("rejects a user row that violates the role/tenant_id constraint at the database level", async () => {
    await expect(
      db("users").insert({
        role: "baker",
        tenant_id: null,
        email: `invalid-baker-${randomUUID()}@example.com`,
        password_hash: "x",
      })
    ).rejects.toThrow();

    const tenantA = await tenantsRepository.create({ slug: `tenant-a-${randomUUID()}` });

    await expect(
      db("users").insert({
        role: "platform_admin",
        tenant_id: tenantA.id,
        email: `invalid-admin-${randomUUID()}@example.com`,
        password_hash: "x",
      })
    ).rejects.toThrow();
  });

  it("rejects a role outside the allowed enum at the database level", async () => {
    await expect(
      db("users").insert({
        role: "super_admin",
        tenant_id: null,
        email: `invalid-role-${randomUUID()}@example.com`,
        password_hash: "x",
      })
    ).rejects.toThrow();
  });
});
