import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("products", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table
      .uuid("category_id")
      .nullable()
      .references("id")
      .inTable("categories")
      .onDelete("SET NULL");
    table.string("name").notNullable();
    table.string("slug").notNullable();
    table.text("description").nullable();
    table.integer("base_price").notNullable();
    table.integer("prep_time_minutes").nullable();
    table.string("ordering_mode").notNullable().defaultTo("instant");
    table.string("status").notNullable().defaultTo("draft");
    // Nullable, no FK yet: recipes table does not exist until Phase 5 (costing).
    table.uuid("recipe_id").nullable();
    table.timestamps(true, true);

    table.unique(["tenant_id", "slug"]);
    table.index(["tenant_id"]);
    table.index(["category_id"]);
  });

  await knex.raw(`
    ALTER TABLE products
    ADD CONSTRAINT products_status_check
    CHECK (status IN ('draft', 'published'))
  `);

  await knex.raw(`
    ALTER TABLE products
    ADD CONSTRAINT products_ordering_mode_check
    CHECK (ordering_mode IN ('instant', 'request_confirm'))
  `);

  await knex.raw(`
    ALTER TABLE products
    ADD CONSTRAINT products_base_price_check
    CHECK (base_price >= 0)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("products");
}
