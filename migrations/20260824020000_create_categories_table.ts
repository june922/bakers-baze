import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("categories", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table.string("name").notNullable();
    table.string("slug").notNullable();
    table.integer("position").notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.unique(["tenant_id", "slug"]);
    table.index(["tenant_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("categories");
}
