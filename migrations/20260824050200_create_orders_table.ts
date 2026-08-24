import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("tenant_id")
      .notNullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table.string("order_number").notNullable();
    table.text("tracking_token_hash").notNullable();
    table.string("status").notNullable().defaultTo("requested");
    table.string("fulfilment_method").notNullable();
    table.timestamp("requested_for").notNullable();
    table.text("delivery_address").nullable();
    table
      .uuid("customer_id")
      .notNullable()
      .references("id")
      .inTable("customers")
      .onDelete("RESTRICT");
    table.integer("amount_due").notNullable();
    table.integer("amount_paid").notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.unique(["tenant_id", "order_number"]);
    table.unique(["tracking_token_hash"]);
    table.index(["tenant_id"]);
    table.index(["customer_id"]);
  });

  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN (
      'requested', 'confirmed', 'declined',
      'awaiting_payment', 'partially_paid', 'paid', 'payment_failed',
      'preparing', 'ready', 'completed', 'cancelled'
    ))
  `);

  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT orders_fulfilment_method_check
    CHECK (fulfilment_method IN ('pickup', 'delivery'))
  `);

  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT orders_amount_due_check
    CHECK (amount_due >= 0)
  `);

  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT orders_amount_paid_check
    CHECK (amount_paid >= 0)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("orders");
}
