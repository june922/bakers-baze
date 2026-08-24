import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("order_item_customizations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table
      .uuid("order_item_id")
      .notNullable()
      .references("id")
      .inTable("order_items")
      .onDelete("CASCADE");
    // Denormalized snapshot only — deliberately no FK to product_option_values,
    // per ARCHITECTURE.md §9: a baker may later rename/reprice/delete an
    // option, but a historical order must retain exactly what was agreed.
    table.string("option_group_name").notNullable();
    table.string("option_value_label").notNullable();
    table.integer("price_delta").notNullable();
    table.timestamps(true, true);

    table.index(["tenant_id"]);
    table.index(["order_item_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("order_item_customizations");
}
