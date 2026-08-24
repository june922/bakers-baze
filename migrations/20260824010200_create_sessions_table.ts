import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("sessions", (table) => {
    table.text("id").primary();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .uuid("tenant_id")
      .nullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table.timestamp("expires_at").notNullable();
    table.text("user_agent").nullable();
    table.string("ip").nullable();
    table.timestamps(true, true);

    table.index(["user_id"]);
    table.index(["expires_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("sessions");
}
