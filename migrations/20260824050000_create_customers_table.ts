import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("customers", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table.string("name").notNullable();
    table.string("phone").notNullable();
    table.string("email").nullable();
    table.timestamps(true, true);

    table.unique(["tenant_id", "phone"]);
    table.index(["tenant_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("customers");
}
