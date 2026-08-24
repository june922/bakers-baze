import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("rate_limit_hits", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.text("bucket_key").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index(["bucket_key", "created_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("rate_limit_hits");
}
