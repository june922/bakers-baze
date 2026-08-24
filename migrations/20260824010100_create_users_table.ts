import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("role").notNullable();
    table
      .uuid("tenant_id")
      .nullable()
      .references("id")
      .inTable("bakeries")
      .onDelete("CASCADE");
    table.string("email").notNullable().unique();
    table.string("phone").nullable();
    table.text("password_hash").notNullable();
    table.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('platform_admin', 'baker'))
  `);

  await knex.raw(`
    ALTER TABLE users
    ADD CONSTRAINT users_tenant_role_check
    CHECK (
      (role = 'platform_admin' AND tenant_id IS NULL) OR
      (role = 'baker' AND tenant_id IS NOT NULL)
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("users");
}
