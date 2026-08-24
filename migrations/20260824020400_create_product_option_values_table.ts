import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("product_option_values", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table
      .uuid("option_group_id")
      .notNullable()
      .references("id")
      .inTable("product_option_groups")
      .onDelete("CASCADE");
    table.string("label").notNullable();
    table.integer("price_delta").notNullable().defaultTo(0);
    table.boolean("available").notNullable().defaultTo(true);
    table.integer("position").notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.index(["tenant_id"]);
    table.index(["option_group_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("product_option_values");
}
