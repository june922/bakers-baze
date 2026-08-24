import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("storefront_settings", (table) => {
    table
      .uuid("tenant_id")
      .primary()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table.string("template_key").notNullable().defaultTo("elegant").references("key").inTable("templates");
    table.string("display_name").notNullable();
    table.string("tagline").nullable();
    table.text("about_text").nullable();
    table.string("contact_email").nullable();
    table.string("contact_phone").nullable();
    table.text("address").nullable();
    table.text("hero_image_url").nullable();
    table.jsonb("branding").notNullable().defaultTo("{}");
    table.jsonb("social").notNullable().defaultTo("{}");
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("storefront_settings");
}
