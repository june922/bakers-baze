import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("templates", (table) => {
    table.string("key").primary();
    table.string("name").notNullable();
    table.text("thumbnail_url").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  await knex("templates").insert({
    key: "elegant",
    name: "Elegant",
    is_active: true,
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("templates");
}
