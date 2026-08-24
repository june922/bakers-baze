import { cache } from "react";
import { tenantsRepository } from "@/src/modules/tenants/tenants.repository";
import type { Bakery } from "@/src/modules/tenants/tenants.types";
import type { Role } from "@/src/modules/auth/auth.types";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: Role;
}

export const resolveTenantBySlug = cache(async (slug: string): Promise<Bakery | undefined> => {
  return tenantsRepository.findBySlug(slug);
});

export function toTenantContext(user: { tenantId: string | null; userId: string; role: Role }): TenantContext {
  if (!user.tenantId) {
    throw new Error("Cannot build a TenantContext for a user without a tenantId");
  }
  return { tenantId: user.tenantId, userId: user.userId, role: user.role };
}
