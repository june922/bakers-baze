import db from "@/src/lib/db";
import type { Customer } from "./customers.types";

interface CustomerRow {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: Date;
  updated_at: Date;
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const customersRepository = {
  async findByIdForTenant(tenantId: string, id: string): Promise<Customer | undefined> {
    const row = await db<CustomerRow>("customers").where({ id, tenant_id: tenantId }).first();
    return row ? toCustomer(row) : undefined;
  },

  async findByPhoneForTenant(tenantId: string, phone: string): Promise<Customer | undefined> {
    const row = await db<CustomerRow>("customers").where({ tenant_id: tenantId, phone }).first();
    return row ? toCustomer(row) : undefined;
  },

  /**
   * Upserts by (tenant_id, phone) inside the given transaction — used from
   * checkout so a repeat customer's name/email stay current without creating
   * duplicate customer rows.
   */
  async upsertForTenant(
    trx: import("knex").Knex.Transaction,
    tenantId: string,
    input: { name: string; phone: string; email: string | null }
  ): Promise<Customer> {
    const [row] = await trx<CustomerRow>("customers")
      .insert({ tenant_id: tenantId, name: input.name, phone: input.phone, email: input.email })
      .onConflict(["tenant_id", "phone"])
      .merge({ name: input.name, email: input.email, updated_at: trx.fn.now() })
      .returning("*");
    return toCustomer(row);
  },
};
