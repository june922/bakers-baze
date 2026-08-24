import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("tenant_order_counters", (table) => {
    table
      .uuid("tenant_id")
      .primary()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table.integer("next_number").notNullable().defaultTo(1);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("tenant_order_counters");
}
