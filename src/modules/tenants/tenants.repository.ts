import db from "@/src/lib/db";
import type { Bakery, BakeryStatus } from "./tenants.types";

interface BakeryRow {
  id: string;
  slug: string;
  status: string;
  template_key: string | null;
  branding: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function toBakery(row: BakeryRow): Bakery {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status as BakeryStatus,
    templateKey: row.template_key,
    branding: row.branding,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const tenantsRepository = {
  async findBySlug(slug: string): Promise<Bakery | undefined> {
    const row = await db<BakeryRow>("bakeries").where({ slug }).first();
    return row ? toBakery(row) : undefined;
  },

  async findById(id: string): Promise<Bakery | undefined> {
    const row = await db<BakeryRow>("bakeries").where({ id }).first();
    return row ? toBakery(row) : undefined;
  },

  async create(input: {
    slug: string;
    status?: BakeryStatus;
    templateKey?: string | null;
  }): Promise<Bakery> {
    const [row] = await db<BakeryRow>("bakeries")
      .insert({
        slug: input.slug,
        status: input.status ?? "trial",
        template_key: input.templateKey ?? null,
      })
      .returning("*");
    return toBakery(row);
  },
};
