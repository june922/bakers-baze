import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("product_option_groups", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
    table.string("name").notNullable();
    table.string("selection_type").notNullable();
    table.boolean("required").notNullable().defaultTo(false);
    table.integer("position").notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.index(["tenant_id"]);
    table.index(["product_id"]);
  });

  await knex.raw(`
    ALTER TABLE product_option_groups
    ADD CONSTRAINT product_option_groups_selection_type_check
    CHECK (selection_type IN ('single', 'multiple'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("product_option_groups");
}
