import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  await knex.schema.createTable("bakeries", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("slug").notNullable().unique();
    table.string("status").notNullable().defaultTo("trial");
    table.string("template_key").nullable();
    table.jsonb("branding").notNullable().defaultTo("{}");
    table.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE bakeries
    ADD CONSTRAINT bakeries_status_check
    CHECK (status IN ('trial', 'active', 'suspended', 'expired'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("bakeries");
}
