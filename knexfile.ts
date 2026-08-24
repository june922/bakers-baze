import "dotenv/config";
import type { Knex } from "knex";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const config: Knex.Config = {
  client: "pg",
  connection: connectionString,
  migrations: {
    directory: "./migrations",
    extension: "ts",
  },
};

export default config;
