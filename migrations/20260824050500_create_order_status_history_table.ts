import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("order_status_history", (table) => {
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
    table.string("from_status").nullable();
    table.string("to_status").notNullable();
    table.string("actor_type").notNullable();
    table.uuid("actor_user_id").nullable();
    table.text("note").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index(["tenant_id"]);
    table.index(["order_id"]);
  });

  await knex.raw(`
    ALTER TABLE order_status_history
    ADD CONSTRAINT order_status_history_actor_type_check
    CHECK (actor_type IN ('system', 'baker', 'webhook'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("order_status_history");
}
