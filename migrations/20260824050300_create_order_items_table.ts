import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("order_items", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table
      .uuid("order_id")
      .notNullable()
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");
    // Nullable + SET NULL: order_items are a historical snapshot that must
    // survive the referenced product being deleted later (see product_name_snapshot).
    table
      .uuid("product_id")
      .nullable()
      .references("id")
      .inTable("products")
      .onDelete("SET NULL");
    table.string("product_name_snapshot").notNullable();
    table.integer("quantity").notNullable();
    table.integer("unit_price_snapshot").notNullable();
    table.timestamps(true, true);

    table.index(["tenant_id"]);
    table.index(["order_id"]);
  });

  await knex.raw(`
    ALTER TABLE order_items
    ADD CONSTRAINT order_items_quantity_check
    CHECK (quantity > 0)
  `);

  await knex.raw(`
    ALTER TABLE order_items
    ADD CONSTRAINT order_items_unit_price_check
    CHECK (unit_price_snapshot >= 0)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("order_items");
}
