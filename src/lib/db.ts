import knex, { type Knex } from "knex";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const db: Knex = knex({
  client: "pg",
  connection: connectionString,
});

export default db;
