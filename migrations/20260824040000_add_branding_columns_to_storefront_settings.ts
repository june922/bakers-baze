import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("storefront_settings", (table) => {
    table.text("logo_url").nullable();
    table.string("primary_color").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("storefront_settings", (table) => {
    table.dropColumn("logo_url");
    table.dropColumn("primary_color");
  });
}
